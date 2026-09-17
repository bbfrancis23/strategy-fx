/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {getServerSession} from 'next-auth/next'
import {patchColumn} from './patchColumn'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
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

const seedProjectBoardColumn = async () => {
  const leader = await new Member({email: 'leader@example.com'}).save()
  const project = await new Project({title: 'Project', leader: leader._id}).save()
  const column = await new Column({title: 'Original Title'}).save()
  const board = await new Board({
    title: 'Board',
    project: project._id,
    columns: [column._id],
  }).save()
  return {leader, project, board, column}
}

describe('patchColumn', () => {
  it('returns 401 when there is no session', async () => {
    const {project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
      body: {title: 'New Title'},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the project does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: new Types.ObjectId().toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: new Types.ObjectId().toString(), boardId: 'x', columnId: 'y'},
      body: {title: 'New Title'},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when the requester is not the project leader', async () => {
    const {project, board, column} = await seedProjectBoardColumn()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
      body: {title: 'New Title'},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when the column does not exist', async () => {
    const {Types} = await import('mongoose')
    const {leader, project, board} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id, columnId: new Types.ObjectId().toString()},
      body: {title: 'New Title'},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('updates the column title', async () => {
    const {leader, project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
      body: {title: 'New Title'},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Column.findById(column._id)
    expect(updated?.title).toBe('New Title')
  })

  it('archives the column on DELETE', async () => {
    const {leader, project, board, column} = await seedProjectBoardColumn()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE',
      query: {projectId: project.id, boardId: board.id, columnId: column.id},
    })

    await patchColumn(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Column.findById(column._id)
    expect(updated?.archive).toBe(true)
  })
})
