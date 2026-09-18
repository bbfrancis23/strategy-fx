// Starts an in-memory MongoDB replica set for the Playwright CI job and
// exports its connection string as MONGO_CONNECT for later steps in the
// same job (via $GITHUB_ENV). Kept alive deliberately (process.stdin.resume())
// so it survives for the rest of the job when launched in the background —
// see the "Start in-memory MongoDB" step in .github/workflows/test.yml.
import {appendFileSync} from 'node:fs'
import {MongoMemoryReplSet} from 'mongodb-memory-server'
import {
  MONGODB_MEMORY_SERVER_BINARY_VERSION,
} from '../../mongo/testUtils/mongoMemoryServerBinary.mjs'

const replSet = await MongoMemoryReplSet.create({
  replSet: {count: 1},
  binary: {version: MONGODB_MEMORY_SERVER_BINARY_VERSION},
})

const uri = replSet.getUri()

if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `MONGO_CONNECT=${uri}\n`)
}

console.log(`mongodb-memory-server ready at ${uri}`)

process.stdin.resume()
