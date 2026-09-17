/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import mongoose from 'mongoose'
import axios from 'axios'
import {getServerSession} from 'next-auth'
import {deleteCheckbox} from './deleteCheckbox'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

jest.mock('next-auth', () => ({
  ...jest.requireActual('next-auth'),
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

describe('deleteCheckbox', () => {
  it('removes the checkbox document and its reference from the section', async () => {
    const memberId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: memberId}})

    const item = await new Item({title: 'Item', owners: [memberId]}).save()
    const checkbox = await new Checkbox({label: 'Do the thing'}).save()
    const section = await new Section({
      content: 'Checklist',
      itemid: item._id,
      checkboxes: [checkbox._id],
    }).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE',
      query: {itemId: item.id, checkboxId: checkbox.id, sectionId: section.id},
    })

    await deleteCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Ok)

    // The checkbox document itself is gone...
    expect(await Checkbox.findById(checkbox._id)).toBeNull()

    // ...and — this is the bug that was fixed — the section no longer
    // holds a dangling reference to it. Previously `.pull(section)`
    // (pulling the section out of its own checkboxes array, a no-op) and
    // saving `item` instead of `section` meant this array was never
    // actually updated, leaving an orphaned reference behind.
    const updatedSection = await Section.findById(section._id)
    expect(
      updatedSection?.checkboxes.map((id: mongoose.Types.ObjectId) => id.toString())
    ).not.toContain(
      checkbox._id.toString()
    )
    expect(updatedSection?.checkboxes).toHaveLength(0)
  })

  it('sends only one response when the transaction fails', async () => {
    const memberId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: memberId}})

    const item = await new Item({title: 'Item', owners: [memberId]}).save()
    const checkbox = await new Checkbox({label: 'Do the thing'}).save()
    const section = await new Section({
      content: 'Checklist',
      itemid: item._id,
      checkboxes: [checkbox._id],
    }).save()

    const deleteOneSpy = jest.spyOn(Checkbox, 'deleteOne').mockImplementationOnce(() => {
      throw new Error('simulated transaction failure')
    })

    try {
      const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: {itemId: item.id, checkboxId: checkbox.id, sectionId: section.id},
      })
      const jsonSpy = jest.spyOn(res, 'json')

      await deleteCheckbox(req, res)

      // This is the other bug that was fixed: on error, the catch block
      // used to fall through and attempt a second response after the
      // first (error) one had already been sent. Asserting a single call
      // is what that regression would have violated.
      expect(jsonSpy).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(axios.HttpStatusCode.InternalServerError)
    } finally {
      // In a `finally` rather than as the last statement: a failed
      // assertion above would otherwise skip this and leak the mocked
      // Checkbox.deleteOne into later tests (no restoreMocks/clearMocks
      // configured in jest.config.js).
      deleteOneSpy.mockRestore()
    }
  })

  it('rejects a section that does not belong to the requested item', async () => {
    const memberId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: memberId}})

    // itemA is the caller's own, legitimately-owned item. itemB is a
    // different item (standing in for "another project") whose section
    // the caller has no real claim to.
    const itemA = await new Item({title: 'Item A', owners: [memberId]}).save()
    const itemB = await new Item({title: 'Item B', owners: []}).save()
    const checkbox = await new Checkbox({label: 'Do the thing'}).save()
    const sectionOnItemB = await new Section({
      content: 'Checklist',
      itemid: itemB._id,
      checkboxes: [checkbox._id],
    }).save()

    // Passes their own real itemId (so the ITEM_OWNER check on itemA
    // passes) but a sectionId that actually belongs to itemB.
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE',
      query: {itemId: itemA.id, checkboxId: checkbox.id, sectionId: sectionOnItemB.id},
    })

    await deleteCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
    // Nothing should have been deleted or mutated.
    expect(await Checkbox.findById(checkbox._id)).not.toBeNull()
    const unchangedSection = await Section.findById(sectionOnItemB._id)
    expect(unchangedSection?.checkboxes).toHaveLength(1)
  })

  it('rejects a checkbox that does not belong to the requested section', async () => {
    const memberId = new mongoose.Types.ObjectId().toString()
    mockGetServerSession.mockResolvedValue({user: {id: memberId}})

    const item = await new Item({title: 'Item', owners: [memberId]}).save()
    const ownedCheckbox = await new Checkbox({label: 'In the section'}).save()
    const section = await new Section({
      content: 'Checklist',
      itemid: item._id,
      checkboxes: [ownedCheckbox._id],
    }).save()
    // Exists, but isn't in `section.checkboxes` — e.g. it belongs to some
    // other section entirely.
    const unrelatedCheckbox = await new Checkbox({label: 'Elsewhere'}).save()

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE',
      query: {itemId: item.id, checkboxId: unrelatedCheckbox.id, sectionId: section.id},
    })

    await deleteCheckbox(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.NotFound)
    expect(await Checkbox.findById(unrelatedCheckbox._id)).not.toBeNull()
  })
})
