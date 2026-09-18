import {test, expect} from '@playwright/test'
import {registerAccount, logIn} from './fixtures/auth'

test('registers a new account, logs in, and reaches the member dashboard', async ({page}) => {
  const account = await registerAccount(page)

  // Registration success reopens the login dialog itself (RegisterForm's
  // startAuth() call) — confirm that before logging in.
  const authDialog = page.getByRole('dialog', {name: 'LOGIN'})
  await expect(authDialog).toBeVisible()

  await logIn(page, account)

  // Login has no built-in navigation — it just closes the dialog and
  // shows a snackbar (asserted inside logIn()). Confirm the session
  // actually took by checking the nav swapped to the logged-in account
  // icon, then follow it to the member dashboard.
  await expect(authDialog).toBeHidden()

  const accountLink = page.getByRole('banner').getByTestId('AccountCircleIcon')
  await expect(accountLink).toBeVisible()

  await accountLink.click()

  await expect(page).toHaveURL(/\/member$/)
})
