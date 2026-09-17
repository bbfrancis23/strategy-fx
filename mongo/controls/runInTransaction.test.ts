/** @jest-environment node */
import {runInTransaction} from './runInTransaction'
import Member from '@/mongo/schemas/MemberSchema'
import Project from '@/mongo/schemas/ProjectSchema'
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

describe('runInTransaction', () => {
  it('commits all writes performed by work', async () => {
    const leader = await new Member({email: 'leader@example.com'}).save()

    await runInTransaction(async (dbSession) => {
      await new Project({title: 'Committed', leader: leader._id}).save({session: dbSession})
    })

    const saved = await Project.findOne({title: 'Committed'})
    expect(saved).not.toBeNull()
  })

  it('rolls back every write and rethrows when work fails partway through', async () => {
    const leader = await new Member({email: 'leader2@example.com'}).save()

    const error = new Error('simulated failure')

    await expect(
      runInTransaction(async (dbSession) => {
        // Let the first write succeed for real before failing, so the
        // assertion below proves actual rollback rather than just that
        // nothing was ever written.
        await new Project({title: 'Should Be Rolled Back', leader: leader._id}).save({
          session: dbSession,
        })
        throw error
      })
    ).rejects.toThrow('simulated failure')

    const saved = await Project.findOne({title: 'Should Be Rolled Back'})
    expect(saved).toBeNull()
  })

  it('propagates the original error rather than swallowing it', async () => {
    const error = new Error('specific failure reason')

    await expect(
      runInTransaction(async () => {
        throw error
      })
    ).rejects.toBe(error)
  })
})
