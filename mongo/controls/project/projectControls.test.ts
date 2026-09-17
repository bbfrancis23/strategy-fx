/** @jest-environment node */
import {findProject, findProjectBoards} from './projectControls'
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

describe('findProject', () => {
  it('returns the project with leader, admins, and members populated', async () => {
    const leader = await new Member({email: 'leader@example.com', name: 'Leader'}).save()
    const admin = await new Member({email: 'admin@example.com', name: 'Admin'}).save()
    const project = await new Project({
      title: 'Project',
      leader: leader._id,
      admins: [admin._id],
    }).save()

    const result = await findProject(project._id.toString())

    expect(result).toBeTruthy()
    expect(result.title).toBe('Project')
    expect(result.leader.email).toBe('leader@example.com')
    expect(result.admins[0].email).toBe('admin@example.com')
  })

  it('returns false when the project does not exist', async () => {
    const {Types} = await import('mongoose')
    const result = await findProject(new Types.ObjectId().toString())

    expect(result).toBe(false)
  })
})

describe('findProjectBoards', () => {
  it('returns non-archived boards with deep-populated columns and items', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()
    const project = await new Project({title: 'Project', leader: leader._id}).save()

    const item = await new Item({title: 'Item', owners: [leader._id]}).save()
    const column = await new Column({title: 'Column', items: [item._id]}).save()
    const board = await new Board({
      title: 'Board',
      project: project._id,
      columns: [column._id],
    }).save()
    await new Board({title: 'Archived Board', project: project._id, archive: true}).save()

    const result = await findProjectBoards(project._id.toString())

    expect(result).toHaveLength(1)
    expect(result[0]._id.toString()).toBe(board._id.toString())
    expect(result[0].columns[0].items[0].title).toBe('Item')
  })

  it('excludes archived columns and items from returned boards', async () => {
    const leader = await new Member({email: 'leader3@example.com'}).save()
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

    const result = await findProjectBoards(project._id.toString())

    expect(result[0].columns).toHaveLength(1)
    expect(result[0].columns[0].items).toHaveLength(1)
    expect(result[0].columns[0].items[0].title).toBe('Active')
  })
})
