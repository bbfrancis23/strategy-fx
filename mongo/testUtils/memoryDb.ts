import {MongoMemoryReplSet} from 'mongodb-memory-server'
import mongoose from 'mongoose'
import db from '@/mongo/db'
import {MONGODB_MEMORY_SERVER_BINARY_VERSION} from './mongoMemoryServerBinary.mjs'

let mongoServer: MongoMemoryReplSet | undefined
let previousMongoConnect: string | undefined

/**
 * Restores MONGO_CONNECT to whatever it was before startTestDb() ran.
 * `delete`s the key rather than assigning `undefined` when there was no
 * prior value — process.env stringifies an `undefined` assignment to the
 * literal string "undefined" instead of removing it.
 */
const restoreMongoConnect = () => {
  if (previousMongoConnect === undefined) {
    delete process.env.MONGO_CONNECT
  } else {
    process.env.MONGO_CONNECT = previousMongoConnect
  }
}

/**
 * Starts an in-memory MongoDB instance and points the app's real
 * `mongo/db.js` connect logic at it, so tests exercise the actual
 * connection code path instead of a mocked one.
 *
 * Uses a single-node replica set, not a plain standalone MongoMemoryServer
 * — most of the mongo/controls functions use mongoose.startSession()
 * transactions, which a standalone instance rejects outright ("Transaction
 * numbers are only allowed on a replica set member or mongos"). A replica
 * set can do everything a standalone instance can, so this covers
 * non-transactional controls too.
 *
 * If db.connect() throws, the memory server and the MONGO_CONNECT
 * override are cleaned up before re-throwing, so a failed startTestDb()
 * doesn't leak a running mongod process or a stale env var into later
 * tests in the same Jest worker.
 */
export const startTestDb = async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {count: 1},
    binary: {version: MONGODB_MEMORY_SERVER_BINARY_VERSION},
  })
  previousMongoConnect = process.env.MONGO_CONNECT
  process.env.MONGO_CONNECT = mongoServer.getUri()

  try {
    await db.connect()
  } catch (err) {
    restoreMongoConnect()
    await mongoServer.stop()
    mongoServer = undefined
    throw err
  }
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
 * restored — via `delete` rather than assignment when it was previously
 * unset, for the same "undefined" stringification reason documented on
 * restoreMongoConnect() above.
 *
 * Also restores MONGO_CONNECT: this harness is meant to be reused across
 * test files, and Jest can reuse worker processes between them — without
 * restoring it, a later suite in the same worker that calls db.connect()
 * without going through startTestDb() first would pick up a stale pointer
 * to an already-stopped memory server instead of failing loudly or using
 * its own.
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
    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv
    }
  }

  await mongoServer?.stop()
  mongoServer = undefined
  restoreMongoConnect()
}

/** Drops all collections so each test starts from a clean database. */
export const clearTestDb = async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}
