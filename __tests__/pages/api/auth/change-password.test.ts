/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import bcryptjs from 'bcryptjs'
import {getServerSession} from 'next-auth/next'
import handler from '@/pages/api/auth/change-password'
import Member from '@/mongo/schemas/MemberSchema'
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

describe('auth/change-password handler', () => {
  it('returns 406 for a non-PATCH method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotAcceptable)
  })

  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {oldPassword: 'old', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 404 when the member does not exist', async () => {
    mockGetServerSession.mockResolvedValue({user: {email: 'ghost@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {oldPassword: 'old', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns 403 when the old password is incorrect', async () => {
    const hashed = await bcryptjs.hash('correct-password', 12)
    await new Member({email: 'member@example.com', password: hashed}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'member@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {oldPassword: 'wrong-password', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
  })

  it('updates the password when the old password is correct', async () => {
    const hashed = await bcryptjs.hash('correct-password', 12)
    await new Member({email: 'member2@example.com', password: hashed}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'member2@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {oldPassword: 'correct-password', newPassword: 'brand-new-password'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Member.findOne({email: 'member2@example.com'})
    expect(bcryptjs.compareSync('brand-new-password', updated?.password ?? '')).toBe(true)
  })
})
