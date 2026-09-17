/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {getServerSession} from 'next-auth/next'
import {patchBoard} from './patchBoard'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
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
  const board = await new Board({title: 'Original Title', project: project._id}).save()
  return {leader, project, board}
}

describe('patchBoard', () => {
  it('returns 401 when there is no session', async () => {
    const {project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {title: 'New Title'},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the requester is not the project leader', async () => {
    const {project, board} = await seedProjectBoard()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {title: 'New Title'},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(401)
    const unchanged = await Board.findById(board._id)
    expect(unchanged?.title).toBe('Original Title')
  })

  it('returns 404 when the board does not exist', async () => {
    const {Types} = await import('mongoose')
    const {leader, project} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: new Types.ObjectId().toString()},
      body: {title: 'New Title'},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('updates the title', async () => {
    const {leader, project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {title: 'New Title'},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Board.findById(board._id)
    expect(updated?.title).toBe('New Title')
  })

  it('updates the scope', async () => {
    const {leader, project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {scope: 'PUBLIC'},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Board.findById(board._id)
    expect(updated?.scope).toBe('PUBLIC')
  })

  it('archives the board', async () => {
    const {leader, project, board} = await seedProjectBoard()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {archive: true},
    })

    await patchBoard(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Board.findById(board._id)
    expect(updated?.archive).toBe(true)
  })
})
