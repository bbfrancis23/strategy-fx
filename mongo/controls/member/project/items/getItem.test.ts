/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {getItem} from './getItem'
import Member from '@/mongo/schemas/MemberSchema'
import Item from '@/mongo/schemas/ItemSchema'
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

describe('getItem', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {itemId: 'someid'},
    })

    await getItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 404 when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {itemId: new Types.ObjectId().toString()},
    })

    await getItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns the item for an authenticated request', async () => {
    const owner = await new Member({email: 'owner@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {itemId: item._id.toString()},
    })

    await getItem(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const body = res._getJSONData() as {item: {title: string}}
    expect(body.item.title).toBe('Item')
  })
})
