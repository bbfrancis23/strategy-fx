const nextJest = require('next/jest')

// Providing the path to the Next.js app lets next/jest load next.config.js
// and .env files, and set up the SWC transform automatically.
const createJestConfig = nextJest({dir: './'})

// Path aliases mirrored from tsconfig.json's "compilerOptions.paths" so
// imports resolve the same way in tests as they do in the app.
const moduleNameMapper = {
  '^@/components/(.*)$': '<rootDir>/components/$1',
  '^@/react/(.*)$': '<rootDir>/react/$1',
  '^@/pages/(.*)$': '<rootDir>/pages/$1',
  '^@/interfaces/(.*)$': '<rootDir>/interfaces/$1',
  '^@/controls/(.*)$': '<rootDir>/mongo/controls/$1',
  '^@/mongo/(.*)$': '<rootDir>/mongo/$1',
  '^@/ui/(.*)$': '<rootDir>/ui/$1',
  '^@/fx/(.*)$': '<rootDir>/fx/$1',
  '^@/error$': '<rootDir>/error',
  '^@/itemComponents/(.*)$':
    '<rootDir>/components/members/projects/boards/columns/items/$1',
  // Generic "@/*" catch-all — must stay last so the more specific
  // aliases above win first, matching tsconfig's paths resolution order.
  '^@/(.*)$': '<rootDir>/$1',
}

/** @type {import('jest').Config} */
const customJestConfig = {
  // .ts (not .js) so @testing-library/jest-dom's type augmentation
  // (toBeInTheDocument(), etc.) is in TypeScript's project scope and
  // "next build"'s type check knows about the custom matchers.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // jsdom is the right default since most of the codebase is React
  // components. Node-only test files (mongo controls, API routes) opt
  // into the node environment with a `@jest-environment node` docblock.
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper,
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  // Without this, `--coverage` only reports on files actually imported
  // by tests, not the whole codebase.
  collectCoverageFrom: [
    'react/**/*.{ts,tsx}',
    'fx/**/*.{ts,tsx}',
    'mongo/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    'error/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}

// createJestConfig is exported this way to ensure next/jest can load the
// Next.js config, which is async
module.exports = createJestConfig(customJestConfig)
