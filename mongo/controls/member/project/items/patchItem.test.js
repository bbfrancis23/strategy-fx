/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {patchItem} from './patchItem'
import Member from '@/mongo/schemas/MemberSchema'
import Item from '@/mongo/schemas/ItemSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))

const mockGetServerSession = getServerSession

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

describe('patchItem', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks({
      method: 'PATCH',
      query: {itemId: 'someid'},
      body: {title: 'New Title'},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 404 when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks({
      method: 'PATCH',
      query: {itemId: new Types.ObjectId().toString()},
      body: {title: 'New Title'},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns 401 when the requester is not an owner of the item', async () => {
    const owner = await new Member({email: 'owner@example.com'}).save()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks({
      method: 'PATCH',
      query: {itemId: item._id.toString()},
      body: {title: 'New Title'},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    const unchanged = await Item.findById(item._id)
    expect(unchanged.title).toBe('Item')
  })

  it('updates the title for an owner', async () => {
    const owner = await new Member({email: 'owner2@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks({
      method: 'PATCH',
      query: {itemId: item._id.toString()},
      body: {title: 'New Title'},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Item.findById(item._id)
    expect(updated.title).toBe('New Title')
  })

  it('updates an arbitrary field via type/value', async () => {
    const owner = await new Member({email: 'owner3@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks({
      method: 'PATCH',
      query: {itemId: item._id.toString()},
      body: {type: 'priority', value: 'high'},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Item.findById(item._id)
    expect(updated.priority).toBe('high')
  })

  it('archives the item on DELETE', async () => {
    const owner = await new Member({email: 'owner4@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks({
      method: 'DELETE',
      query: {itemId: item._id.toString()},
      body: {},
    })

    await patchItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Item.findById(item._id)
    expect(updated.archive).toBe(true)
  })
})
