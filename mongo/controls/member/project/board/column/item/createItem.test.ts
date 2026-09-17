/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import mongoose from 'mongoose'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {createItem} from './createItem'
import findPublicBoard from '@/mongo/controls/member/project/board/findPublicBoard'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))

// jest.spyOn can't redefine this module's `default` export directly (it's
// non-configurable, a side effect of the ESM interop), so instead mock the
// whole module with a factory whose default implementation *is* the real
// one — jest.fn(actual.default) — so every test gets fully realistic
// behavior unless it explicitly overrides it with mockImplementationOnce.
jest.mock('@/mongo/controls/member/project/board/findPublicBoard', () => {
  const actual = jest.requireActual('@/mongo/controls/member/project/board/findPublicBoard')
  return {
    __esModule: true,
    default: jest.fn(actual.default),
  }
})

const mockGetServerSession = getServerSession as jest.Mock
const mockFindPublicBoard = findPublicBoard as jest.Mock

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(async () => {
  await clearTestDb()
  mockGetServerSession.mockReset()
})

// createItem's own permission check populates project.leader/admins/members
// with real Member documents before checking `.id` against the session, so
// the test needs a real Member (not a bare ObjectId) for the leader.
const seedProjectBoardColumn = async () => {
  const leader = await new Member({email: 'leader@example.com', name: 'Leader'}).save()
  const project = await new Project({title: 'Project', leader: leader._id}).save()
  const column = await new Column({title: 'Column', items: []}).save()
  const board = await new Board({
    title: 'Board',
    project: project._id,
    columns: [column._id],
  }).save()
  return {leader, project, board, column}
}

describe('createItem', () => {
  it('creates the item and adds it to the column', async () => {
    const {leader, project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
      body: {title: 'New Item'},
    })

    await createItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)

    const updatedColumn = await Column.findById(column._id)
    expect(updatedColumn?.items).toHaveLength(1)

    const savedItem = await Item.findById(updatedColumn?.items[0])
    expect(savedItem?.title).toBe('New Item')
    expect(savedItem?.owners?.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      leader._id.toString(),
    ])
  })

  it('rejects a column that does not belong to the requested board', async () => {
    const {leader, project, board} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    // Exists, but isn't in board.columns.
    const foreignColumn = await new Column({title: 'Foreign', items: []}).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, boardId: board.id, columnId: foreignColumn.id},
      body: {title: 'New Item'},
    })

    await createItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
    const unchanged = await Column.findById(foreignColumn._id)
    expect(unchanged?.items).toHaveLength(0)
  })

  it('rolls back the item creation and sends a stable error message if the transaction fails', async () => {
    const {leader, project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    // Let the item save succeed for real, then fail the next transactional
    // step — this is what actually proves rollback works, rather than
    // just failing before any write happens.
    const saveSpy = jest.spyOn(Column.prototype, 'save').mockImplementationOnce(() => {
      throw new Error('simulated transaction failure')
    })

    try {
      const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: {projectId: project.id, boardId: board.id, columnId: column.id},
        body: {title: 'New Item'},
      })

      await createItem(req, res)

      expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)
      const body = res._getJSONData() as {message: string}
      expect(body.message).toBe('Error creating item')

      // The rollback itself: the item that was saved before the injected
      // failure must not have stuck.
      expect(await Item.findOne({title: 'New Item'})).toBeNull()
      const unchangedColumn = await Column.findById(column._id)
      expect(unchangedColumn?.items).toHaveLength(0)
    } finally {
      saveSpy.mockRestore()
    }
  })

  it('still reports success if the item was saved but the post-commit board refresh fails', async () => {
    const {leader, project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    // mockImplementationOnce is self-consuming — no manual restore needed,
    // and restoreMocks:true (jest.config.js) resets it between tests too.
    mockFindPublicBoard.mockImplementationOnce(() => {
      throw new Error('simulated board refresh failure')
    })

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
      body: {title: 'New Item'},
    })

    await createItem(req, res)

    // The item was genuinely created — reporting a 500 here would make
    // CreateItemForm.tsx (which only treats 201 as success) retry the
    // request and create a duplicate item.
    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)
    const updatedColumn = await Column.findById(column._id)
    expect(updatedColumn?.items).toHaveLength(1)

    // board falls back to the one fetched before the transaction (stale,
    // but a valid object) rather than undefined — the client calls
    // setBoard(res.data.board) unconditionally on success, so undefined
    // would wipe the board out of the UI.
    const body = res._getJSONData() as {board?: {_id?: string}}
    expect(body.board).toBeDefined()
    expect(body.board?._id?.toString()).toBe(board._id.toString())
  })
})
