import {test, expect} from './fixtures/auth'

test('selecting another board from the title dropdown navigates to it', async ({page, account}) => {
  test.setTimeout(180_000)

  await page.goto('/member')

  await page.getByRole('button', {name: 'create-project'}).click()
  await page.getByLabel('New Project').fill('E2E Board Switch Project')
  await page.getByRole('button', {name: 'save'}).click()
  await expect(page.getByText('Project created')).toBeVisible()
  await expect(page.getByText('Project created')).toBeHidden()

  await page.getByRole('button', {name: 'E2E Board Switch Project'}).click()
  await expect(page).toHaveURL(/\/member\/projects\/[^/]+$/, {timeout: 30_000})

  for (const title of ['Board One', 'Board Two']) {
    await page.getByRole('button', {name: 'create-board'}).click()
    await page.getByLabel('New Board').fill(title)
    await page.getByRole('button', {name: 'save'}).click()
    await expect(page.getByText('Board created')).toBeVisible()
    await expect(page.getByText('Board created')).toBeHidden()
  }

  await page.getByRole('button', {name: 'Board One'}).click()
  await expect(page).toHaveTitle(/^Board One- Strategy Fx/, {timeout: 30_000})

  await page.getByTestId('ArrowDropDownCircleIcon').click()
  await page.getByRole('menuitem', {name: 'Board Two'}).click()

  await expect(page).toHaveTitle(/^Board Two- Strategy Fx/, {timeout: 60_000})
  await expect(page.getByRole('menu')).toBeHidden()
})
