/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import mongoose from 'mongoose'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {patchBoardCols} from './patchBoardCols'
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

describe('patchBoardCols', () => {
  it('reorders items across multiple columns in one request', async () => {
    const leaderId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: leaderId}})

    const itemA1 = new mongoose.Types.ObjectId().toString()
    const itemA2 = new mongoose.Types.ObjectId().toString()
    const itemB1 = new mongoose.Types.ObjectId().toString()

    const columnA = await new Column({title: 'A', items: [itemA1, itemA2]}).save()
    const columnB = await new Column({title: 'B', items: [itemB1]}).save()
    const project = await new Project({title: 'Project', leader: leaderId}).save()
    const board = await new Board({
      title: 'Board',
      project: project._id,
      columns: [columnA._id, columnB._id],
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {
        boardCols: {
          [columnA.id]: {items: [{id: itemA2}, {id: itemA1}]},
          [columnB.id]: {items: [{id: itemB1}]},
        },
      },
    })

    await patchBoardCols(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)

    const updatedColumnA = await Column.findById(columnA._id)
    expect(updatedColumnA?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      itemA2,
      itemA1,
    ])
  })

  it('rejects a column that does not belong to the requested board', async () => {
    const leaderId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: leaderId}})

    const ownItem = new mongoose.Types.ObjectId().toString()
    const foreignItem = new mongoose.Types.ObjectId().toString()

    const ownColumn = await new Column({title: 'Own', items: [ownItem]}).save()
    // Exists, but isn't in `board.columns` — e.g. it belongs to another
    // board/project entirely.
    const foreignColumn = await new Column({title: 'Foreign', items: [foreignItem]}).save()

    const project = await new Project({title: 'Project', leader: leaderId}).save()
    const board = await new Board({
      title: 'Board',
      project: project._id,
      columns: [ownColumn._id],
    }).save()

    // Passes their own real projectId/boardId (so the leader check
    // passes) but boardCols includes a column that isn't actually on
    // this board.
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {
        boardCols: {
          [ownColumn.id]: {items: [{id: ownItem}]},
          [foreignColumn.id]: {items: [{id: 'anything'}]},
        },
      },
    })

    await patchBoardCols(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
    // Nothing should have been mutated, including the owned column.
    const unchangedForeign = await Column.findById(foreignColumn._id)
    expect(unchangedForeign?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      foreignItem,
    ])
  })

  it('rolls back all column writes if one column in the batch fails', async () => {
    const leaderId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: leaderId}})

    const itemA = new mongoose.Types.ObjectId().toString()
    const columnA = await new Column({title: 'A', items: [itemA]}).save()
    // Listed as belonging to the board (so it passes the ownership check
    // above) but has no actual Column document behind it — a real data-
    // integrity scenario (e.g. a previously-deleted column whose id was
    // never cleaned out of board.columns) that naturally throws when
    // `column.items = ids` runs on the null lookup result, no mocking
    // needed. This is what proves the whole batch is atomic: columnA's
    // write must not stick just because it happened to be processed
    // before the failing one.
    const phantomColumnId = new mongoose.Types.ObjectId()

    const project = await new Project({title: 'Project', leader: leaderId}).save()
    const board = await new Board({
      title: 'Board',
      project: project._id,
      columns: [columnA._id, phantomColumnId],
    }).save()

    const newItemForA = new mongoose.Types.ObjectId().toString()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {
        boardCols: {
          [columnA.id]: {items: [{id: newItemForA}]},
          [phantomColumnId.toString()]: {items: [{id: newItemForA}]},
        },
      },
    })

    await patchBoardCols(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)

    const unchangedColumnA = await Column.findById(columnA._id)
    expect(unchangedColumnA?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      itemA,
    ])

    // `message = e` used to serialize to "{}" in the JSON response — an
    // Error's own properties are non-enumerable — silently losing the
    // failure reason even though it was caught. It should be a real,
    // non-empty string.
    const body = res._getJSONData() as {message: string}
    expect(typeof body.message).toBe('string')
    expect(body.message.length).toBeGreaterThan(0)
  })
})
