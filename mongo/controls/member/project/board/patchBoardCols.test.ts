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
    // Not just columnA — a regression that skipped or failed to persist
    // columnB would still pass without this.
    const updatedColumnB = await Column.findById(columnB._id)
    expect(updatedColumnB?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      itemB1,
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
    // Nothing should have been mutated, including the owned column — a
    // regression that mutated ownColumn before rejecting the request over
    // the foreign one would still pass without this.
    const unchangedOwn = await Column.findById(ownColumn._id)
    expect(unchangedOwn?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      ownItem,
    ])
    const unchangedForeign = await Column.findById(foreignColumn._id)
    expect(unchangedForeign?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      foreignItem,
    ])
  })

  it('rejects an item that does not belong to any column on the requested board', async () => {
    const leaderId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: leaderId}})

    const ownItem = new mongoose.Types.ObjectId().toString()
    // Never placed in any column on this board — e.g. it belongs to a
    // column on a different board/project entirely.
    const foreignItem = new mongoose.Types.ObjectId().toString()

    const column = await new Column({title: 'Column', items: [ownItem]}).save()
    const project = await new Project({title: 'Project', leader: leaderId}).save()
    const board = await new Board({
      title: 'Board',
      project: project._id,
      columns: [column._id],
    }).save()

    // The column itself belongs to the board (passes the column-level
    // check), but its requested items list smuggles in an id that isn't
    // actually part of this board anywhere.
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {
        boardCols: {
          [column.id]: {items: [{id: ownItem}, {id: foreignItem}]},
        },
      },
    })

    await patchBoardCols(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Forbidden)
    const unchanged = await Column.findById(column._id)
    expect(unchanged?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      ownItem,
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

    // Reuse the existing itemA (rather than a brand-new id) so this
    // request passes the item-ownership check and the failure being
    // tested is actually the phantom column, not that check.
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {projectId: project.id, boardId: board.id},
      body: {
        boardCols: {
          [columnA.id]: {items: [{id: itemA}]},
          [phantomColumnId.toString()]: {items: [{id: itemA}]},
        },
      },
    })

    await patchBoardCols(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)

    const unchangedColumnA = await Column.findById(columnA._id)
    expect(unchangedColumnA?.items.map((id: mongoose.Types.ObjectId) => id.toString())).toEqual([
      itemA,
    ])

    // `message = e` used to serialize to "{}" in the JSON response (an
    // Error's own properties are non-enumerable), and a later fix that
    // used `e.message` instead risked forwarding raw Mongo/Mongoose
    // exception text to the client. It should be the same static message
    // the neighboring controls use.
    const body = res._getJSONData() as {message: string}
    expect(body.message).toBe('Error updating columns')
  })
})
