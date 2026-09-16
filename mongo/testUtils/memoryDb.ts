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
 * Tears the connection down through the app's own `db.disconnect()` rather
 * than calling `mongoose.disconnect()` directly. `db.disconnect()` only
 * actually disconnects when NODE_ENV === 'production' (a no-op under
 * Jest's NODE_ENV=test) — see mongo/db.js — but it's also the only thing
 * that resets `db.js`'s private `connection.isConnected` flag, which isn't
 * exported. Calling `mongoose.disconnect()` directly leaves that flag
 * stale (true), so a later `db.connect()` call in the same module registry
 * would hit its "already connected" early-return and never connect to a
 * fresh memory server. Forcing NODE_ENV to 'production' for the call gets
 * a real disconnect *and* a correctly reset flag, then NODE_ENV is
 * restored.
 *
 * Also restores MONGO_CONNECT to whatever it was before startTestDb(). This
 * harness is meant to be reused across test files, and Jest can reuse
 * worker processes between them — without restoring it, a later suite in
 * the same worker that calls db.connect() without going through
 * startTestDb() first would pick up a stale pointer to an already-stopped
 * memory server instead of failing loudly or using its own. Note: MONGO_
 * CONNECT is `delete`d rather than set to `previousMongoConnect` when it
 * was previously unset — assigning `undefined` to a process.env property
 * stringifies it to the literal string "undefined" instead of removing it.
 */
export const stopTestDb = async () => {
  // @types/node types NODE_ENV as read-only (it's meant to be fixed for
  // the life of the process); it's still an ordinary env var at runtime,
  // so a narrow cast is needed to flip it for this call and back.
  const mutableEnv = process.env as {NODE_ENV?: string}
  const previousNodeEnv = mutableEnv.NODE_ENV
  mutableEnv.NODE_ENV = 'production'
  try {
    await db.disconnect()
  } finally {
    mutableEnv.NODE_ENV = previousNodeEnv
  }

  await mongoServer?.stop()
  mongoServer = undefined

  if (previousMongoConnect === undefined) {
    delete process.env.MONGO_CONNECT
  } else {
    process.env.MONGO_CONNECT = previousMongoConnect
  }
}

/** Drops all collections so each test starts from a clean database. */
export const clearTestDb = async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}
