/** @jest-environment node */
import findProjectItems from './findProjectItems'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
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

describe('findProjectItems', () => {
  it('returns items across project boards, tagged with the board title as category', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()
    const project = await new Project({title: 'Project', leader: leader._id}).save()
    const item = await new Item({title: 'Item', owners: [leader._id]}).save()
    const column = await new Column({title: 'Column', items: [item._id]}).save()
    await new Board({title: 'Board One', project: project._id, columns: [column._id]}).save()

    const result = await findProjectItems(project._id.toString())

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Item')
    expect(result[0].category).toBe('Board One')
  })

  it('excludes archived columns and items', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()
    const project = await new Project({title: 'Project', leader: leader._id}).save()
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
    await new Board({
      title: 'Board',
      project: project._id,
      columns: [activeColumn._id, archivedColumn._id],
    }).save()

    const result = await findProjectItems(project._id.toString())

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Active')
  })

  it('returns an empty array when the project has no boards', async () => {
    const {Types} = await import('mongoose')
    const result = await findProjectItems(new Types.ObjectId().toString())

    expect(result).toEqual([])
  })
})
