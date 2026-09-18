import {defineConfig, devices} from '@playwright/test'

/**
 * reuseExistingServer lets a developer run `npm run dev` in one terminal
 * and `npm run test:e2e` in another without Playwright spawning a second
 * server on the same port. CI always starts fresh.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // `next build` alone takes ~2.5min here (this app does heavy SSG
    // against a live external content API at build time) — 180s wasn't
    // enough margin before `next start` even got a chance to boot.
    timeout: 5 * 60 * 1000,
  },
})
