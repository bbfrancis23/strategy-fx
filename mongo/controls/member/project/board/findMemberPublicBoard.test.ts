/** @jest-environment node */
import findPublicBoard from './findMemberPublicBoard'
import Member from '@/mongo/schemas/MemberSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'
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

describe('findPublicBoard (member/project/board/findMemberPublicBoard)', () => {
  it('returns a board with scope PUBLIC, deep-populated through sections', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()
    const item = await new Item({title: 'Item', owners: [leader._id]}).save()
    const column = await new Column({title: 'Column', items: [item._id]}).save()
    const board = await new Board({
      title: 'Board',
      columns: [column._id],
      scope: 'PUBLIC',
    }).save()

    const result = await findPublicBoard(board._id.toString())

    expect(result).toBeTruthy()
    expect(result.columns[0].items[0].title).toBe('Item')
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
      scope: 'PUBLIC',
    }).save()

    const result = await findPublicBoard(board._id.toString())

    expect(result.columns).toHaveLength(1)
    expect(result.columns[0].items).toHaveLength(1)
  })
})
