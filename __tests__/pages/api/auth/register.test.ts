/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import bcryptjs from 'bcryptjs'
import handler from '@/pages/api/auth/register'
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

describe('auth/register handler', () => {
  it('does nothing for a non-POST method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(await Member.countDocuments()).toBe(0)
  })

  it('returns 422 for an invalid email', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'not-an-email', password: 'password123'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(await Member.countDocuments()).toBe(0)
  })

  it('returns 422 for a short password', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'new@example.com', password: 'short'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(await Member.countDocuments()).toBe(0)
  })

  it('returns 422 when the member already exists', async () => {
    await new Member({email: 'existing@example.com', password: 'hashed'}).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'existing@example.com', password: 'password123'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(await Member.countDocuments()).toBe(1)
  })

  it('registers a new member with a hashed password', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {email: 'new@example.com', password: 'password123'},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    const saved = await Member.findOne({email: 'new@example.com'})
    expect(saved).not.toBeNull()
    expect(saved?.password).not.toBe('password123')
    expect(bcryptjs.compareSync('password123', saved?.password ?? '')).toBe(true)
  })
})
