/** @jest-environment node */
import findPublicBoard from './findPublicBoard'
import Member from '@/mongo/schemas/MemberSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
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

describe('findPublicBoard (member/project/board)', () => {
  it('returns the board deep-populated through checkboxes, regardless of scope', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()
    const item = await new Item({
      title: 'Item',
      owners: [leader._id],
    }).save()
    const checkbox = await new Checkbox({label: 'Checkbox', value: false}).save()
    const section = await new Section({
      content: 'Section',
      itemid: item._id,
      checkboxes: [checkbox._id],
    }).save()
    item.sections.push(section._id)
    await item.save()
    const column = await new Column({title: 'Column', items: [item._id]}).save()
    const board = await new Board({
      title: 'Board',
      columns: [column._id],
      scope: 'PRIVATE',
    }).save()

    const result = await findPublicBoard(board._id.toString())

    expect(result).not.toBeNull()
    expect(result.columns[0].items[0].sections[0].checkboxes[0].label).toBe('Checkbox')
  })

  it('returns null when the board does not exist', async () => {
    const {Types} = await import('mongoose')
    const result = await findPublicBoard(new Types.ObjectId().toString())

    expect(result).toBeNull()
  })

  it('returns null for an archived board', async () => {
    const board = await new Board({title: 'Archived', archive: true}).save()

    const result = await findPublicBoard(board._id.toString())

    expect(result).toBeNull()
  })

  it('excludes archived columns and items', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()
    const activeItem = await new Item({title: 'Active', owners: [leader._id]}).save()
    const archivedItem = await new Item({
      title: 'Archived',
      owners: [leader._id],
      archive: true,
    }).save()
    const activeColumn = await new Column({
      title: 'Active Column',
      items: [activeItem._id, archivedItem._id],
    }).save()
    const archivedColumn = await new Column({title: 'Archived Column', archive: true}).save()
    const board = await new Board({
      title: 'Board',
      columns: [activeColumn._id, archivedColumn._id],
    }).save()

    const result = await findPublicBoard(board._id.toString())

    expect(result.columns).toHaveLength(1)
    expect(result.columns[0].items).toHaveLength(1)
    expect(result.columns[0].items[0].title).toBe('Active')
  })
})
