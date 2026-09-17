/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {getServerSession} from 'next-auth/next'
import {findMember, findMemberProjects, findMembers, updateMember} from './memberControls'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
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

describe('findMember', () => {
  it('returns the member for a known email', async () => {
    await new Member({email: 'known@example.com', name: 'Known'}).save()

    const result = await findMember('known@example.com')

    expect(result).toMatchObject({email: 'known@example.com', name: 'Known'})
  })

  it('returns false when no member matches the email', async () => {
    const result = await findMember('missing@example.com')

    expect(result).toBe(false)
  })
})

describe('findMemberProjects', () => {
  it('returns projects where the member is leader, admin, or member', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()
    const admin = await new Member({email: 'admin@example.com'}).save()
    const other = await new Member({email: 'other@example.com'}).save()

    const ledProject = await new Project({title: 'Led', leader: leader._id}).save()
    const adminProject = await new Project({
      title: 'Adminned',
      leader: other._id,
      admins: [admin._id],
    }).save()
    await new Project({title: 'Unrelated', leader: other._id}).save()

    const result = await findMemberProjects(leader._id.toString())
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Led')

    const adminResult = await findMemberProjects(admin._id.toString())
    expect(adminResult).toHaveLength(1)
    expect(adminResult[0].title).toBe('Adminned')

    expect(ledProject).toBeDefined()
    expect(adminProject).toBeDefined()
  })

  it('excludes archived projects', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()
    await new Project({title: 'Archived', leader: leader._id, archive: true}).save()

    const result = await findMemberProjects(leader._id.toString())
    expect(result).toHaveLength(0)
  })
})

describe('findMembers', () => {
  it('returns all members with only id, email, and name', async () => {
    await new Member({email: 'a@example.com', name: 'A', password: 'secret'}).save()
    await new Member({email: 'b@example.com', name: 'B', password: 'secret'}).save()

    const result = await findMembers()

    expect(result).toHaveLength(2)
    expect(result?.[0]).not.toHaveProperty('password')
    expect(result?.map((m: {email: string}) => m.email).sort()).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })
})

describe('updateMember', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {memberName: 'New Name'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the session member does not exist', async () => {
    mockGetServerSession.mockResolvedValue({user: {email: 'ghost@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {memberName: 'New Name'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('updates the member name', async () => {
    await new Member({email: 'named@example.com', name: 'Old Name'}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'named@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {memberName: 'New Name'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Member.findOne({email: 'named@example.com'})
    expect(updated?.name).toBe('New Name')
  })

  it('rejects an email update without an @ symbol', async () => {
    await new Member({email: 'bademail@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'bademail@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {email: 'not-an-email'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(422)
    const unchanged = await Member.findOne({email: 'bademail@example.com'})
    expect(unchanged).not.toBeNull()
  })

  it('rejects an email update that collides with an existing member', async () => {
    await new Member({email: 'first@example.com'}).save()
    await new Member({email: 'second@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'first@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {email: 'second@example.com'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(422)
    const unchanged = await Member.findOne({email: 'first@example.com'})
    expect(unchanged).not.toBeNull()
  })

  it('updates the email when it is unique', async () => {
    await new Member({email: 'oldmail@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {email: 'oldmail@example.com'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {email: 'newmail@example.com'},
    })

    await updateMember(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Member.findOne({email: 'newmail@example.com'})
    expect(updated).not.toBeNull()
  })
})
