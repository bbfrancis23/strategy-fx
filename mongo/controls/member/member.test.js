/** @jest-environment node */
import Member from '@/mongo/schemas/MemberSchema'
import {basicMemberFields} from './member'
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

describe('basicMemberFields', () => {
  it('returns only id, email, and name', async () => {
    const member = await new Member({email: 'member@example.com', name: 'Member Name'}).save()

    const result = await basicMemberFields(member)

    expect(result).toEqual({
      id: member.id,
      email: 'member@example.com',
      name: 'Member Name',
    })
  })

  it('falls back to an empty string when the member has no name', async () => {
    const member = await new Member({email: 'noname@example.com'}).save()

    const result = await basicMemberFields(member)

    expect(result).toEqual({
      id: member.id,
      email: 'noname@example.com',
      name: '',
    })
  })
})
