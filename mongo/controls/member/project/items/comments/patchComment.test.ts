/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {patchComment} from './patchComment'
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

const seedProjectItemComment = async () => {
  const leader = await new Member({email: 'leader@example.com'}).save()
  const owner = await new Member({email: 'owner@example.com'}).save()
  const project = await new Project({title: 'Project', leader: leader._id}).save()
  const item = await new Item({title: 'Item', owners: [owner._id]}).save()
  const comment = await new Comment({
    content: 'Original content',
    owner: owner._id,
    itemid: item._id,
  }).save()
  item.comments.push(comment._id)
  await item.save()
  return {leader, owner, project, item, comment}
}

describe('patchComment', () => {
  it('returns 401 when there is no session', async () => {
    const {project, item, comment} = await seedProjectItemComment()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, itemId: item.id, commentId: comment.id},
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the project does not exist', async () => {
    const {Types} = await import('mongoose')
    const {item, comment} = await seedProjectItemComment()
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        projectId: new Types.ObjectId().toString(),
        itemId: item.id,
        commentId: comment.id,
      },
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when the comment does not exist', async () => {
    const {Types} = await import('mongoose')
    const {project, item} = await seedProjectItemComment()
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        projectId: project.id,
        itemId: item.id,
        commentId: new Types.ObjectId().toString(),
      },
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when the comment does not belong to the requested item (IDOR)', async () => {
    const {project, item, comment} = await seedProjectItemComment()
    const otherOwner = await new Member({email: 'otherowner@example.com'}).save()
    const foreignItem = await new Item({title: 'Foreign Item', owners: [otherOwner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: otherOwner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, itemId: foreignItem.id, commentId: comment.id},
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(404)
    const unchanged = await Comment.findById(comment._id)
    expect(unchanged?.content).toBe('Original content')
  })

  it('returns 401 when requester is not the comment owner or a project leader/admin', async () => {
    const {project, item, comment} = await seedProjectItemComment()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, itemId: item.id, commentId: comment.id},
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(401)
    const unchanged = await Comment.findById(comment._id)
    expect(unchanged?.content).toBe('Original content')
  })

  it('updates the content for the comment owner', async () => {
    const {owner, project, item, comment} = await seedProjectItemComment()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, itemId: item.id, commentId: comment.id},
      body: {content: 'New content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Comment.findById(comment._id)
    expect(updated?.content).toBe('New content')
  })

  it('lets the project leader update a comment they do not own', async () => {
    const {leader, project, item, comment} = await seedProjectItemComment()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, itemId: item.id, commentId: comment.id},
      body: {content: 'Leader edited content'},
    })

    await patchComment(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Comment.findById(comment._id)
    expect(updated?.content).toBe('Leader edited content')
  })
})
