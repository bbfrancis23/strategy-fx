import {test as base, expect, type Page} from '@playwright/test'

export interface TestAccount {
  email: string
  password: string
}

const PASSWORD = 'Test1234!'

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

/**
 * Registration success reopens the login dialog itself (see RegisterForm's
 * startAuth() call), so the caller doesn't need to reopen it before
 * logging in.
 */
export const registerAccount = async (page: Page): Promise<TestAccount> => {
  const account: TestAccount = {email: uniqueEmail(), password: PASSWORD}

  await page.goto('/')
  // Scoped to the AppBar (role "banner"): the home page also has its own
  // marketing "Sign In & Try It" button using the same LoginIcon.
  await page.getByRole('banner').getByTestId('LoginIcon').click()

  const authDialog = page.getByRole('dialog', {name: 'LOGIN'})
  await authDialog.getByRole('button', {name: 'Register New Member'}).click()

  const registerDialog = page.getByRole('dialog', {name: 'REGISTER'})
  await registerDialog.getByLabel('Email address').fill(account.email)
  await registerDialog.getByLabel('Password', {exact: true}).fill(account.password)
  await registerDialog.getByRole('button', {name: 'Register'}).click()

  await expect(page.getByText('You are now Registered Please Login')).toBeVisible()

  return account
}

/** Assumes the login dialog is already open (true right after registerAccount()). */
export const logIn = async (page: Page, account: TestAccount) => {
  const authDialog = page.getByRole('dialog', {name: 'LOGIN'})
  await authDialog.getByLabel('Email address').fill(account.email)
  await authDialog.getByLabel('Password', {exact: true}).fill(account.password)
  await authDialog.getByRole('button', {name: 'Login'}).click()

  await expect(page.getByText('You are now Logged In')).toBeVisible()
}

export const registerAndLogIn = async (page: Page): Promise<TestAccount> => {
  const account = await registerAccount(page)
  await logIn(page, account)
  return account
}

interface AuthFixtures {
  account: TestAccount
}

/**
 * Extends Playwright's base test with an `account` fixture: a freshly
 * registered-and-logged-in member, ready before the test body runs. Specs
 * that need an authenticated session should import `test`/`expect` from
 * this file instead of '@playwright/test'.
 */
export const test = base.extend<AuthFixtures>({
  account: async ({page}, use) => {
    const account = await registerAndLogIn(page)
    await use(account)
  },
})

export {expect}
