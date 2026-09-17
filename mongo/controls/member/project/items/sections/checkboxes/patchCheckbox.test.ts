/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import {patchCheckbox} from './patchCheckbox'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
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

const seedChecklistSection = async () => {
  const leader = await new Member({email: 'leader@example.com'}).save()
  const project = await new Project({title: 'Project', leader: leader._id}).save()
  const item = await new Item({title: 'Item', owners: [leader._id]}).save()
  const sectiontype = await new SectionType({
    _id: SectionTypes.CHECKLIST,
    title: 'Checklist',
  }).save()
  const checkbox = await new Checkbox({label: 'Old label', value: false}).save()
  const section = await new Section({
    content: 'Section',
    itemid: item._id,
    sectiontype: sectiontype._id,
    checkboxes: [checkbox._id],
  }).save()
  return {leader, project, item, section, checkbox}
}

describe('patchCheckbox', () => {
  it('returns 401 when there is no session', async () => {
    const {project, item, section, checkbox} = await seedChecklistSection()
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: item.id,
        sectionId: section.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {value: true},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('returns 404 when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    const {leader, project, section, checkbox} = await seedChecklistSection()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: new Types.ObjectId().toString(),
        sectionId: section.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {value: true},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns 404 when the section is not a checklist', async () => {
    const {leader, project, item, checkbox} = await seedChecklistSection()
    const textType = await new SectionType({
      _id: SectionTypes.TEXT,
      title: 'Text',
    }).save()
    const textSection = await new Section({
      content: 'Text section',
      itemid: item._id,
      sectiontype: textType._id,
    }).save()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: item.id,
        sectionId: textSection.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {value: true},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
  })

  it('returns 401 when the requester has no permission to toggle the checkbox', async () => {
    const {project, item, section, checkbox} = await seedChecklistSection()
    const outsider = await new Member({email: 'outsider@example.com'}).save()
    mockGetServerSession.mockResolvedValue({user: {id: outsider._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: item.id,
        sectionId: section.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {value: true},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
  })

  it('toggles the checkbox value for a project member', async () => {
    const {leader, project, item, section, checkbox} = await seedChecklistSection()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: item.id,
        sectionId: section.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {value: true},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Checkbox.findById(checkbox._id)
    expect(updated?.value).toBe(true)
  })

  it('updates the checkbox label for an item owner', async () => {
    const {leader, project, item, section, checkbox} = await seedChecklistSection()
    mockGetServerSession.mockResolvedValue({user: {id: leader._id.toString()}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {
        itemId: item.id,
        sectionId: section.id,
        projectId: project.id,
        checkboxId: checkbox.id,
      },
      body: {label: 'New label'},
    })

    await patchCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)
    const updated = await Checkbox.findById(checkbox._id)
    expect(updated?.label).toBe('New label')
  })
})
