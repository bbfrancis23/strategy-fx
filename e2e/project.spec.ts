import {test, expect} from './fixtures/auth'

test('creates a project and navigates to it', async ({page, account}) => {
  // The target page's getServerSideProps does several sequential DB calls
  // (findProject, findMember, findProjectBoards, a permission check) and
  // was observed taking 20s+ against the E2E in-memory Mongo instance —
  // well past Playwright's 30s default. Give this one test more room.
  test.setTimeout(60_000)

  await page.goto('/member')

  await page.getByRole('button', {name: 'create-project'}).click()

  await page.getByLabel('New Project').fill('E2E Test Project')
  await page.getByRole('button', {name: 'save'}).click()

  const createdSnackbar = page.getByText('Project created')
  await expect(createdSnackbar).toBeVisible()
  // The snackbar is bottom-right (see pages/App.tsx) and can overlap the
  // grid on this short page — wait for its autoHideDuration to clear
  // before clicking, or the click can land on the snackbar instead.
  await expect(createdSnackbar).toBeHidden()

  // No auto-navigation on create — the new tile appears in the grid and the
  // test drives the navigation itself by clicking it.
  const projectTile = page.getByRole('button', {name: 'E2E Test Project'})
  await expect(projectTile).toBeVisible()

  await projectTile.click()

  await expect(page).toHaveURL(/\/member\/projects\/[^/]+$/, {timeout: 30_000})
})
