/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {createSection} from './createSection'
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

describe('createSection', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks({
      method: 'POST',
      query: {itemId: 'someid'},
      body: {content: 'New Section'},
    })

    await createSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 404 when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {itemId: new Types.ObjectId().toString()},
      body: {content: 'New Section'},
    })

    await createSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns 401 when the requester is not an item owner', async () => {
    const owner = await new Member({email: 'owner@example.com'}).save()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {itemId: item._id.toString()},
      body: {content: 'New Section'},
    })

    await createSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('creates the section and adds it to the item', async () => {
    const owner = await new Member({email: 'owner2@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks({
      method: 'POST',
      query: {itemId: item._id.toString()},
      body: {content: 'New Section'},
    })

    await createSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const body = res._getJSONData()
    expect(body.item.sections).toHaveLength(1)
    expect(body.item.sections[0].content).toBe('New Section')
  })
})
