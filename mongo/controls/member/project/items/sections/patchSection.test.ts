/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import mongoose from 'mongoose'
import {getServerSession} from 'next-auth/next'
import {patchSection} from './patchSection'
import Member from '@/mongo/schemas/MemberSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import SectionType from '@/mongo/schemas/SectionTypeSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
import {SectionTypes} from '@/react/section'
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

const seedItemSection = async () => {
  const owner = await new Member({email: 'owner@example.com'}).save()
  const item = await new Item({title: 'Item', owners: [owner._id]}).save()
  const section = await new Section({content: 'Original', itemid: item._id}).save()
  return {owner, item, section}
}

describe('patchSection', () => {
  it('returns 401 when there is no session', async () => {
    const {section} = await seedItemSection()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: section.id},
      body: {content: 'New content'},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when the section does not exist', async () => {
    const {Types} = await import('mongoose')
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: new Types.ObjectId().toString()},
      body: {content: 'New content'},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when the requester is not an item owner', async () => {
    const {section} = await seedItemSection()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: section.id},
      body: {content: 'New content'},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(403)
    const unchanged = await Section.findById(section._id)
    expect(unchanged?.content).toBe('Original')
  })

  it('updates the section content', async () => {
    const {owner, section} = await seedItemSection()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: section.id},
      body: {content: 'New content'},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Section.findById(section._id)
    expect(updated?.content).toBe('New content')
  })

  it('creates a new checkbox on a checklist section given a label', async () => {
    const {owner, item} = await seedItemSection()
    await new SectionType({_id: SectionTypes.CHECKLIST, title: 'Checklist'}).save()
    const checklistSection = await new Section({
      content: 'Checklist section',
      itemid: item._id,
      sectiontype: SectionTypes.CHECKLIST,
    }).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: checklistSection.id},
      body: {sectiontype: SectionTypes.CHECKLIST, label: 'New checkbox'},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Created)
    const updated = await Section.findById(checklistSection._id)
    expect(updated?.checkboxes).toHaveLength(1)
    const checkbox = await Checkbox.findById(updated?.checkboxes[0])
    expect(checkbox?.label).toBe('New checkbox')
  })

  it('replaces the checkboxes array on a checklist section', async () => {
    const {owner, item} = await seedItemSection()
    await new SectionType({_id: SectionTypes.CHECKLIST, title: 'Checklist'}).save()
    const existingCheckbox = await new Checkbox({label: 'Existing'}).save()
    const checklistSection = await new Section({
      content: 'Checklist section',
      itemid: item._id,
      sectiontype: SectionTypes.CHECKLIST,
      checkboxes: [existingCheckbox._id],
    }).save()
    const replacementCheckbox = await new Checkbox({label: 'Replacement'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: owner._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {sectionId: checklistSection.id},
      body: {sectiontype: SectionTypes.CHECKLIST, checkboxes: [replacementCheckbox.id]},
    })

    await patchSection(req, res)

    expect(res.statusCode).toBe(200)
    const updated = await Section.findById(checklistSection._id)
    expect(updated?.checkboxes.map((c: mongoose.Types.ObjectId) => c.toString())).toEqual([
      replacementCheckbox.id,
    ])
  })
})
