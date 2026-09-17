/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import bcryptjs from 'bcryptjs'
import handler from '@/pages/api/auth/check-code'
import Member from '@/mongo/schemas/MemberSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

describe('auth/check-code handler', () => {
  it('returns 404 when no member matches the email', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'ghost@example.com', code: '123456', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 for an incorrect code', async () => {
    await new Member({
      email: 'member@example.com',
      authCode: '111111',
      authTime: new Date(),
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member@example.com', code: '999999', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    const updated = await Member.findOne({email: 'member@example.com'})
    expect(updated?.invalidCount).toBe(1)
  })

  it('locks the account after too many incorrect codes', async () => {
    await new Member({
      email: 'member2@example.com',
      authCode: '111111',
      authTime: new Date(),
      invalidCount: 5,
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member2@example.com', code: '999999', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(423)
    const updated = await Member.findOne({email: 'member2@example.com'})
    expect(updated?.locked).toBe(true)
  })

  it('returns 400 when the code has expired', async () => {
    const eleventMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)
    await new Member({
      email: 'member3@example.com',
      authCode: '111111',
      authTime: eleventMinutesAgo,
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member3@example.com', code: '111111', newPassword: 'newpassword'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
  })

  it('updates the password for a valid, unexpired code', async () => {
    await new Member({
      email: 'member4@example.com',
      authCode: '111111',
      authTime: new Date(),
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'member4@example.com', code: '111111', newPassword: 'brand-new-password'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Member.findOne({email: 'member4@example.com'})
    expect(bcryptjs.compareSync('brand-new-password', updated?.password ?? '')).toBe(true)
  })
})
