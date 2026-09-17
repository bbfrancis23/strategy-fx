/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {createComment} from './createComment'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Comment from '@/mongo/schemas/CommentSchema'
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

const seedProjectItem = async () => {
  const owner = await new Member({email: 'owner@example.com'}).save()
  const project = await new Project({title: 'Project', leader: owner._id}).save()
  const item = await new Item({title: 'Item', owners: [owner._id]}).save()
  return {owner, project, item}
}

describe('createComment', () => {
  it('returns 401 when there is no session', async () => {
    const {project, item} = await seedProjectItem()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, itemId: item.id},
      body: {content: 'A comment'},
    })

    await createComment(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the project does not exist', async () => {
    const {Types} = await import('mongoose')
    const {item} = await seedProjectItem()
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: new Types.ObjectId().toString(), itemId: item.id},
      body: {content: 'A comment'},
    })

    await createComment(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    const {project} = await seedProjectItem()
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, itemId: new Types.ObjectId().toString()},
      body: {content: 'A comment'},
    })

    await createComment(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('creates the comment and adds it to the item', async () => {
    const {owner, project, item} = await seedProjectItem()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {projectId: project.id, itemId: item.id},
      body: {content: 'A comment'},
    })

    await createComment(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const body = res._getJSONData() as {
      item: {comments: {content: string; owner: {email: string}}[]}
    }
    expect(body.item.comments).toHaveLength(1)
    expect(body.item.comments[0].content).toBe('A comment')
    expect(body.item.comments[0].owner.email).toBe('owner@example.com')

    const savedItem = await Item.findById(item._id)
    expect(savedItem?.comments).toHaveLength(1)
  })

  it('rolls back the comment if the transaction fails partway through', async () => {
    const {owner, project, item} = await seedProjectItem()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const saveSpy = jest.spyOn(Item.prototype, 'save').mockImplementationOnce(() => {
      throw new Error('simulated failure')
    })

    try {
      const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: {projectId: project.id, itemId: item.id},
        body: {content: 'Should not persist'},
      })

      await createComment(req, res)

      expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)
      expect(await Comment.findOne({content: 'Should not persist'})).toBeNull()
      const unchangedItem = await Item.findById(item._id)
      expect(unchangedItem?.comments).toHaveLength(0)
    } finally {
      saveSpy.mockRestore()
    }
  })
})
