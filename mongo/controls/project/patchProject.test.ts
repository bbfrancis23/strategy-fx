/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import mongoose from 'mongoose'
import {getServerSession} from 'next-auth/next'
import {patchProject} from './patchProject'
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

const seedProject = async () => {
  const leader = await new Member({email: 'leader@example.com'}).save()
  const project = await new Project({title: 'Original Title', leader: leader._id}).save()
  return {leader, project}
}

describe('patchProject', () => {
  it('returns 401 when there is no session', async () => {
    const {project} = await seedProject()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {title: 'New Title'},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the project does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: new Types.ObjectId().toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: new Types.ObjectId().toString()},
      body: {title: 'New Title'},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when the requester is not the project leader', async () => {
    const {project} = await seedProject()
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: new Types.ObjectId().toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {title: 'New Title'},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(403)
    const unchanged = await Project.findById(project._id)
    expect(unchanged?.title).toBe('Original Title')
  })

  it('updates the title when the requester is the leader', async () => {
    const {leader, project} = await seedProject()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {title: 'New Title'},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.title).toBe('New Title')
  })

  it('archives the project', async () => {
    const {leader, project} = await seedProject()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {archive: true},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.archive).toBe(true)
  })

  it('adds a member', async () => {
    const {leader, project} = await seedProject()
    const newMember = await new Member({email: 'newmember@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {addMember: newMember._id.toString()},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.members.map((m: mongoose.Types.ObjectId) => m.toString())).toContain(
      newMember._id.toString(),
    )
  })

  it('removes a member', async () => {
    const {leader, project} = await seedProject()
    const member = await new Member({email: 'member@example.com'}).save()
    project.members.push(member._id)
    await project.save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {removeMember: member._id.toString()},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.members.map((m: mongoose.Types.ObjectId) => m.toString())).not.toContain(
      member._id.toString(),
    )
  })

  it('promotes a member to admin', async () => {
    const {leader, project} = await seedProject()
    const member = await new Member({email: 'promote@example.com'}).save()
    project.members.push(member._id)
    await project.save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {makeAdmin: member._id.toString()},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.admins.map((m: mongoose.Types.ObjectId) => m.toString())).toContain(
      member._id.toString(),
    )
    expect(updated?.members.map((m: mongoose.Types.ObjectId) => m.toString())).not.toContain(
      member._id.toString(),
    )
  })

  it('demotes an admin back to member', async () => {
    const {leader, project} = await seedProject()
    const admin = await new Member({email: 'demote@example.com'}).save()
    project.admins.push(admin._id)
    await project.save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id},
      body: {removeAdmin: admin._id.toString()},
    })

    await patchProject(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Project.findById(project._id)
    expect(updated?.members.map((m: mongoose.Types.ObjectId) => m.toString())).toContain(
      admin._id.toString(),
    )
    expect(updated?.admins.map((m: mongoose.Types.ObjectId) => m.toString())).not.toContain(
      admin._id.toString(),
    )
  })
})
