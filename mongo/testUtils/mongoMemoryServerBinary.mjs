// Pinned to a well-established series rather than mongodb-memory-server's
// default (whatever the latest MongoDB release is, currently 8.x) for
// determinism. Note: a handshake error hit during development ("Missing
// required sub-document 'driver' in the client metadata document") looked
// at first like a server-version incompatibility, but turned out to be an
// upstream bug in mongodb-memory-server-core's own bundled mongodb driver
// (7.6.0) — see the "overrides" entry in package.json, which pins that
// nested dependency to 7.5.0. Changing this binary version alone does not
// fix it.
//
// Plain .mjs (not .ts): every consumer of this constant needs to read it,
// including e2e/scripts/*.mjs, which run directly via `node` with no
// TypeScript transpilation step.
export const MONGODB_MEMORY_SERVER_BINARY_VERSION = '7.0.14'
