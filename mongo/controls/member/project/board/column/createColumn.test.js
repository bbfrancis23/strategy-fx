/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {createColumn} from './createColumn'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))

const mockGetServerSession = getServerSession

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
  const board = await new Board({title: 'Board', project: project._id}).save()
  return {leader, project, board}
}

describe('createColumn', () => {
  it('returns 204 when the title is missing', async () => {
    const {req, res} = createMocks({method: 'POST', body: {}})

    await createColumn(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NoContent)
  })

  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks({method: 'POST', body: {title: 'New Column'}})

    await createColumn(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 403 when the requester is not the project leader', async () => {
    const {project, board} = await seedProjectBoard()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {projectId: project.id, boardId: board.id},
      body: {title: 'New Column'},
    })

    await createColumn(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
  })

  it('returns 404 when the board does not exist', async () => {
    const {Types} = await import('mongoose')
    const {leader, project} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {projectId: project.id, boardId: new Types.ObjectId().toString()},
      body: {title: 'New Column'},
    })

    await createColumn(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('creates the column and adds it to the board', async () => {
    const {leader, project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {projectId: project.id, boardId: board.id},
      body: {title: 'New Column'},
    })

    await createColumn(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)
    const updatedBoard = await Board.findById(board._id)
    expect(updatedBoard.columns).toHaveLength(1)
    const savedColumn = await Column.findById(updatedBoard.columns[0])
    expect(savedColumn.title).toBe('New Column')
  })
})
