#!/usr/bin/env node
// Wraps `playwright test` so a plain `npm run test:e2e` never touches a
// real database by accident. .env.local's MONGO_CONNECT points at this
// project's shared dev Atlas cluster — forgetting to override it before an
// E2E run would silently create real accounts/projects/boards there on
// every run, since Next.js loads .env.local automatically for `next start`.
//
// Locally, this script starts its own in-memory MongoDB replica set and
// overrides MONGO_CONNECT for the `playwright test` child process, which
// passes it on to the `next build && next start` webServer child that
// Playwright itself spawns (env vars cascade through the process chain).
// The memory server is torn down once the run finishes.
//
// In CI, .github/workflows/test.yml starts its own memory server as an
// earlier background step and exports MONGO_CONNECT via $GITHUB_ENV before
// this script even runs — so this script just runs Playwright directly
// there instead of starting a second, redundant memory server.
import {spawn} from 'node:child_process'
import {MongoMemoryReplSet} from 'mongodb-memory-server'
import {
  MONGODB_MEMORY_SERVER_BINARY_VERSION,
} from '../../mongo/testUtils/mongoMemoryServerBinary.mjs'

const runPlaywright = (env) => new Promise((resolve, reject) => {
  const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true,
    env,
  })
  child.on('exit', (code) => resolve(code ?? 1))
  child.on('error', reject)
})

const main = async () => {
  if (process.env.CI) {
    process.exitCode = await runPlaywright(process.env)
    return
  }

  console.log('Starting a local in-memory MongoDB for this E2E run...')
  const replSet = await MongoMemoryReplSet.create({
    replSet: {count: 1},
    binary: {version: MONGODB_MEMORY_SERVER_BINARY_VERSION},
  })

  try {
    process.exitCode = await runPlaywright({...process.env, MONGO_CONNECT: replSet.getUri()})
  } finally {
    await replSet.stop()
  }
}

main()
