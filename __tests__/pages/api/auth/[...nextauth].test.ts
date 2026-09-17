/** @jest-environment node */
import bcryptjs from 'bcryptjs'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import Member from '@/mongo/schemas/MemberSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

// authOptions.providers[0].authorize is next-auth's own internal wrapper
// (calling it directly returns null unconditionally, outside the real
// auth flow) — the function we actually wrote lives at .options.authorize.
const authorize: any = (authOptions.providers[0] as any).options.authorize

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

describe('authOptions.callbacks.jwt', () => {
  it('copies member._id onto the token when present', () => {
    const token = authOptions.callbacks.jwt({token: {sub: 'x'}, member: {_id: 'member-1'}} as any)
    expect(token._id).toBe('member-1')
  })

  it('leaves the token unchanged when there is no member', () => {
    const token = authOptions.callbacks.jwt({token: {sub: 'x'}} as any)
    expect(token._id).toBeUndefined()
  })
})

describe('authOptions.callbacks.signIn', () => {
  it('returns true and does nothing for a non-google provider', async () => {
    const result = await authOptions.callbacks.signIn({
      user: {email: 'someone@example.com'},
      account: {provider: 'credentials'},
    } as any)

    expect(result).toBe(true)
    expect(await Member.countDocuments()).toBe(0)
  })

  it('creates a new member on first google sign-in', async () => {
    const result = await authOptions.callbacks.signIn({
      user: {email: 'newgoogle@example.com', name: 'New Google User'},
      account: {provider: 'google'},
    } as any)

    expect(result).toBe(true)
    const created = await Member.findOne({email: 'newgoogle@example.com'})
    expect(created?.name).toBe('New Google User')
  })

  it('updates the image for an existing member on google sign-in', async () => {
    await new Member({email: 'existinggoogle@example.com', name: 'Existing'}).save()

    const result = await authOptions.callbacks.signIn({
      user: {email: 'existinggoogle@example.com', image: 'http://example.com/pic.png'},
      account: {provider: 'google'},
    } as any)

    expect(result).toBe(true)
    const updated = await Member.findOne({email: 'existinggoogle@example.com'})
    expect(updated?.image).toBe('http://example.com/pic.png')
  })
})

describe('authOptions.callbacks.session', () => {
  it('sets session.user.id from token.sub', async () => {
    await new Member({email: 'sessioned@example.com'}).save()

    const session = await authOptions.callbacks.session({
      session: {user: {email: 'sessioned@example.com'}},
      token: {sub: 'the-sub'},
    } as any)

    expect(session.user.id).toBe('the-sub')
  })
})

describe('credentials provider authorize', () => {
  it('throws when no credentials are supplied', async () => {
    await expect(authorize(undefined)).rejects.toThrow('No Credentials')
  })

  it('throws Unauthorized when email or password is missing', async () => {
    await expect(
      authorize({email: 'someone@example.com'})
    ).rejects.toThrow(/Unauthorized|Ivalid Credentials/)
  })

  it('throws when no member matches the email', async () => {
    await expect(
      authorize({email: 'ghost@example.com', password: 'password123'})
    ).rejects.toThrow(/Ivalid Credentials/)
  })

  it('throws Locked when the member account is locked', async () => {
    const hashed = await bcryptjs.hash('password123', 12)
    await new Member({email: 'locked@example.com', password: hashed, locked: true}).save()

    await expect(
      authorize({email: 'locked@example.com', password: 'password123'})
    ).rejects.toThrow(/Locked/)
  })

  it('increments invalidCount and throws for a wrong password', async () => {
    const hashed = await bcryptjs.hash('correct-password', 12)
    await new Member({email: 'wrongpass@example.com', password: hashed}).save()

    await expect(
      authorize({email: 'wrongpass@example.com', password: 'wrong'})
    ).rejects.toThrow(/Ivalid Credentials/)

    const updated = await Member.findOne({email: 'wrongpass@example.com'})
    expect(updated?.invalidCount).toBe(1)
  })

  it('locks the account after five failed attempts', async () => {
    const hashed = await bcryptjs.hash('correct-password', 12)
    await new Member({
      email: 'aboutolock@example.com',
      password: hashed,
      invalidCount: 4,
    }).save()

    await expect(
      authorize({email: 'aboutolock@example.com', password: 'wrong'})
    ).rejects.toThrow()

    const updated = await Member.findOne({email: 'aboutolock@example.com'})
    expect(updated?.locked).toBe(true)
  })

  it('returns the member for a correct password and resets invalidCount', async () => {
    const hashed = await bcryptjs.hash('correct-password', 12)
    await new Member({
      email: 'goodlogin@example.com',
      password: hashed,
      invalidCount: 3,
    }).save()

    const result = await authorize({
      email: 'goodlogin@example.com',
      password: 'correct-password',
    })

    expect(result?.email).toBe('goodlogin@example.com')
    const updated = await Member.findOne({email: 'goodlogin@example.com'})
    expect(updated?.invalidCount).toBe(0)
  })
})
