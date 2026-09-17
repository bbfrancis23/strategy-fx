/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {deleteSection} from './deleteSection'
import Member from '@/mongo/schemas/MemberSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
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

describe('deleteSection', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks({
      method: 'DELETE',
      query: {sectionId: 'someid'},
    })

    await deleteSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 401 when the requester is not an item owner', async () => {
    const owner = await new Member({email: 'owner@example.com'}).save()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    const section = await new Section({content: 'Section', itemid: item._id}).save()
    item.sections.push(section._id)
    await item.save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks({
      method: 'DELETE',
      query: {sectionId: section._id.toString()},
    })

    await deleteSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    const unchanged = await Section.findById(section._id)
    expect(unchanged).not.toBeNull()
  })

  it('deletes the section and pulls it off the item', async () => {
    const owner = await new Member({email: 'owner2@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    const section = await new Section({content: 'Section', itemid: item._id}).save()
    item.sections.push(section._id)
    await item.save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks({
      method: 'DELETE',
      query: {sectionId: section._id.toString()},
    })

    await deleteSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const deletedSection = await Section.findById(section._id)
    expect(deletedSection).toBeNull()
    const body = res._getJSONData()
    expect(body.item.sections).toHaveLength(0)
  })
})
