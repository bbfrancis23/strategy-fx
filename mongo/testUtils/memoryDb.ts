import {MongoMemoryServer} from 'mongodb-memory-server'
import mongoose from 'mongoose'
import db from '@/mongo/db'

let mongoServer: MongoMemoryServer | undefined
let previousMongoConnect: string | undefined

/**
 * Starts an in-memory MongoDB instance and points the app's real
 * `mongo/db.js` connect logic at it, so tests exercise the actual
 * connection code path instead of a mocked one.
 */
export const startTestDb = async () => {
  mongoServer = await MongoMemoryServer.create()
  previousMongoConnect = process.env.MONGO_CONNECT
  process.env.MONGO_CONNECT = mongoServer.getUri()
  await db.connect()
}

/**
 * Tears the connection down directly via mongoose rather than the app's
 * own `db.disconnect()`, because that function only actually disconnects
 * when NODE_ENV === 'production' (a no-op under Jest's NODE_ENV=test) —
 * see mongo/db.js. That's fine for the app's request-per-connection
 * lifecycle, but tests need a real disconnect so the memory server can
 * shut down cleanly.
 *
 * Also restores MONGO_CONNECT to whatever it was before startTestDb(). This
 * harness is meant to be reused across test files, and Jest can reuse
 * worker processes between them — without restoring it, a later suite in
 * the same worker that calls db.connect() without going through
 * startTestDb() first would pick up a stale pointer to an already-stopped
 * memory server instead of failing loudly or using its own.
 */
export const stopTestDb = async () => {
  await mongoose.disconnect()
  await mongoServer?.stop()
  mongoServer = undefined
  process.env.MONGO_CONNECT = previousMongoConnect
}

/** Drops all collections so each test starts from a clean database. */
export const clearTestDb = async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}
