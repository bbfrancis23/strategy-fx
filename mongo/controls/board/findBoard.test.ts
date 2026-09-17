/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {getBoard} from './findBoard'
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

const mockGetServerSession = getServerSession as jest.Mock

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

const seedProjectBoard = async () => {
  const leader = await new Member({email: 'leader@example.com'}).save()
  const project = await new Project({title: 'Project', leader: leader._id}).save()
  const item = await new Item({title: 'Item', owners: [leader._id]}).save()
  const column = await new Column({title: 'Column', items: [item._id]}).save()
  const board = await new Board({
    title: 'Board',
    project: project._id,
    columns: [column._id],
  }).save()
  return {leader, project, board, column, item}
}

describe('getBoard', () => {
  it('returns 401 when there is no session', async () => {
    const {project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {projectId: project.id, boardId: board.id},
    })

    await getBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 403 when the requester is not a project member', async () => {
    const {project, board} = await seedProjectBoard()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {projectId: project.id, boardId: board.id},
    })

    await getBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
  })

  it('returns the board deep-populated for a project member', async () => {
    const {leader, project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {projectId: project.id, boardId: board.id},
    })

    await getBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const body = res._getJSONData() as {board: {columns: {items: {title: string}[]}[]}}
    expect(body.board.columns[0].items[0].title).toBe('Item')
  })

  it('excludes archived columns and items from the returned board', async () => {
    const {leader, project, board, column} = await seedProjectBoard()
    const archivedItem = await new Item({
      title: 'Archived Item',
      owners: [leader._id],
      archive: true,
    }).save()
    const archivedColumn = await new Column({title: 'Archived Column', archive: true}).save()
    board.columns.push(archivedColumn._id)
    await board.save()
    column.items.push(archivedItem._id)
    await column.save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {projectId: project.id, boardId: board.id},
    })

    await getBoard(req, res)

    const body = res._getJSONData() as {board: {columns: {items: unknown[]}[]}}
    expect(body.board.columns).toHaveLength(1)
    expect(body.board.columns[0].items).toHaveLength(1)
  })
})
