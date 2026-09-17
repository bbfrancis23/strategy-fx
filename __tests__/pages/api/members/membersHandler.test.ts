/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import membersHandler from '@/pages/api/members/membersHandler'
import {findMembers} from '@/mongo/controls/member/memberControls'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))
jest.mock('@/mongo/controls/member/memberControls', () => ({
  findMembers: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock
const mockFindMembers = findMembers as jest.Mock

afterEach(() => {
  mockGetServerSession.mockReset()
  mockFindMembers.mockReset()
})

describe('members/membersHandler', () => {
  it('returns 405 for a non-GET method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await membersHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.MethodNotAllowed)
    expect(mockGetServerSession).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await membersHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(mockFindMembers).not.toHaveBeenCalled()
  })

  it('returns 500 when findMembers throws', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})
    mockFindMembers.mockRejectedValue(new Error('db error'))

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await membersHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)
  })

  it('returns the members list for an authenticated GET', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})
    mockFindMembers.mockResolvedValue([{id: '1', email: 'a@example.com', name: 'A'}])

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await membersHandler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const body = res._getJSONData() as {members: unknown[]}
    expect(body.members).toHaveLength(1)
  })
})
