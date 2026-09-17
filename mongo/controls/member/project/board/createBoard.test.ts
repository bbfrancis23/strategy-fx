/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {createBoard} from './createBoard'
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

describe('createBoard (member/project/board)', () => {
  it('returns 204 when the title is missing', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST', body: {}})

    await createBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NoContent)
  })

  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {title: 'New Board'},
    })

    await createBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 403 when the requester is not the project leader', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    const project = await new Project({title: 'Project', leader: leader._id}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id},
      body: {title: 'New Board'},
    })

    await createBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
    expect(await Board.countDocuments()).toBe(0)
  })

  it('creates the board and returns updated project boards', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()
    const project = await new Project({title: 'Project', leader: leader._id}).save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id},
      body: {title: 'New Board'},
    })

    await createBoard(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)
    const body = res._getJSONData() as {boards: {title: string}[]}
    expect(body.boards).toHaveLength(1)
    expect(body.boards[0].title).toBe('New Board')
  })
})
