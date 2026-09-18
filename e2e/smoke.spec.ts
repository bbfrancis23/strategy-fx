import {test, expect} from '@playwright/test'

/**
 * Verifies the Playwright config/webServer wiring itself (build, start,
 * baseURL) independently of any auth flow — the dedicated auth spec covers
 * register/login.
 */
test('home page loads and shows the logged-out login icon', async ({page}) => {
  await page.goto('/')

  // Scoped to the AppBar (role "banner"): the home page also has its own
  // marketing "Sign In & Try It" button using the same LoginIcon.
  await expect(page.getByRole('banner').getByTestId('LoginIcon')).toBeVisible()
})
