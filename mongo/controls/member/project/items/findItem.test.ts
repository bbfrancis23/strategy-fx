/** @jest-environment node */
import {findItem} from './findItem'
import Member from '@/mongo/schemas/MemberSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
import Comment from '@/mongo/schemas/CommentSchema'
import {startTestDb, stopTestDb, clearTestDb} from '@/mongo/testUtils/memoryDb'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

describe('findItem', () => {
  it('returns the item deep-populated through sections/checkboxes and comments/owner', async () => {
    const owner = await new Member({email: 'owner@example.com', name: 'Owner'}).save()
    const item = await new Item({title: 'Item', owners: [owner._id]}).save()
    const checkbox = await new Checkbox({label: 'Checkbox'}).save()
    const section = await new Section({
      content: 'Section',
      itemid: item._id,
      checkboxes: [checkbox._id],
    }).save()
    const comment = await new Comment({
      content: 'A comment',
      owner: owner._id,
      itemid: item._id,
    }).save()
    item.sections.push(section._id)
    item.comments.push(comment._id)
    await item.save()

    const result = await findItem(item._id.toString())

    expect(result.title).toBe('Item')
    expect(result.sections[0].checkboxes[0].label).toBe('Checkbox')
    expect(result.comments[0].owner.email).toBe('owner@example.com')
  })

  it('returns undefined when the item does not exist', async () => {
    const {Types} = await import('mongoose')
    const result = await findItem(new Types.ObjectId().toString())

    expect(result).toBeUndefined()
  })

  it('returns undefined when the itemId is not a valid ObjectId', async () => {
    const result = await findItem('not-a-valid-id')

    expect(result).toBeUndefined()
  })
})
