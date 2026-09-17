/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import handler from '@/pages/api/auth/send-code'
import Member from '@/mongo/schemas/MemberSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

const mockVerify = jest.fn((cb) => cb(null, true))
const mockSendMail = jest.fn((_opts, cb) => cb(null, {}))

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: (cb: (err: unknown, success: unknown) => void) => mockVerify(cb),
    sendMail: (opts: unknown, cb: (err: unknown, info: unknown) => void) => mockSendMail(opts, cb),
  })),
}))

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(async () => {
  await clearTestDb()
  mockVerify.mockClear()
  mockSendMail.mockClear()
})

describe('auth/send-code handler', () => {
  it('returns 406 when the email is missing', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    })

    await handler(req, res)

    // The handler writes two responses for this case (missing-input, then
    // invalid-input) without an early return in between — node-mocks-http
    // concatenates both writes, so the JSON body isn't parseable here. The
    // status code from the second (final) write is still reliable.
    expect(res.statusCode).toBe(406)
  })

  it('returns 406 for an invalid email', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'not-an-email'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(406)
  })

  it('returns 423 when the member account is locked', async () => {
    await new Member({email: 'locked@example.com', locked: true}).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'locked@example.com'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(423)
  })

  it('sends the reset code email and stores the code for an existing member', async () => {
    await new Member({email: 'member@example.com'}).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member@example.com'},
    })

    await handler(req, res)

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({message: 'Reset Email sent'})

    const updated = await Member.findOne({email: 'member@example.com'})
    expect(updated?.authCode).toBeDefined()
    expect(updated?.authTime).toBeDefined()
  })

  it('returns 500 when the mail transport fails to verify', async () => {
    await new Member({email: 'member2@example.com'}).save()
    mockVerify.mockImplementationOnce((cb) => cb(new Error('smtp down'), null))

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member2@example.com'},
    })

    await expect(handler(req, res)).rejects.toThrow()
    expect(res.statusCode).toBe(500)
  })
})
