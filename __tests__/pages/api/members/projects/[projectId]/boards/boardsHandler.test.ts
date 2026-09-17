/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import boardsHandler from '@/pages/api/members/projects/[projectId]/boards/boardsHandler'
import {createBoard} from '@/mongo/controls/member/project/board/createBoard'
import {startTestDb, stopTestDb} from '@/mongo/testUtils/memoryDb'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/board/createBoard', () => ({
  createBoard: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock
const mockCreateBoard = createBoard as jest.Mock

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(() => {
  mockGetServerSession.mockReset()
  mockCreateBoard.mockReset()
})

describe('boards/boardsHandler', () => {
  it('returns 405 for a non-POST method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await boardsHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.MethodNotAllowed)
    expect(mockCreateBoard).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await boardsHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(mockCreateBoard).not.toHaveBeenCalled()
  })

  it('dispatches POST to createBoard for an authenticated request', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await boardsHandler(req, res)

    expect(mockCreateBoard).toHaveBeenCalledTimes(1)
    expect(mockCreateBoard).toHaveBeenCalledWith(req, res)
  })
})
