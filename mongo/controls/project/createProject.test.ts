/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import mongoose from 'mongoose'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import createProject from './createProject'
import Project from '@/mongo/schemas/ProjectSchema'
import {startTestDb, stopTestDb, clearTestDb} from '../../testUtils/memoryDb'

jest.mock('next-auth/next', () => ({
  // Keep the module's real default export (NextAuth) intact — it's still
  // called at import time by pages/api/auth/[...nextauth].ts — and only
  // override the named `getServerSession` export used by createProject.
  // __esModule must be set explicitly: it's non-enumerable on the real
  // module, so the spread below silently drops it, which breaks default
  // export interop (`import NextAuth from 'next-auth/next'` elsewhere).
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock

// Longer hook timeout: MongoMemoryServer.create() downloads a MongoDB
// binary on first run (uncached machine/CI runner), which can easily
// exceed Jest's default 5s hook timeout and fail the suite for reasons
// unrelated to the test logic. Any future mongo/controls test using this
// harness should do the same.
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

describe('createProject', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {title: 'New Project'},
    })

    await createProject(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(res._getJSONData()).toEqual({message: 'Authenticate to Create a Project'})

    const count = await Project.countDocuments()
    expect(count).toBe(0)
  })

  it('returns 422 when the title is missing', async () => {
    const userId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: userId}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    })

    await createProject(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.UnprocessableEntity)
    expect(res._getJSONData()).toEqual({message: 'Project Title is Required'})

    const count = await Project.countDocuments()
    expect(count).toBe(0)
  })

  it('creates the project and returns it for an authenticated request', async () => {
    const userId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: userId}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {title: 'New Project'},
    })

    await createProject(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)

    const json = res._getJSONData() as {message: string; projects: {title: string; leader: string}[]}
    expect(json.message).toBe('Project Created')
    expect(json.projects).toHaveLength(1)
    expect(json.projects[0]).toMatchObject({title: 'New Project', leader: userId})

    const saved = await Project.findOne({title: 'New Project'})
    expect(saved).not.toBeNull()
    expect(saved?.leader.toString()).toBe(userId)
  })
})
