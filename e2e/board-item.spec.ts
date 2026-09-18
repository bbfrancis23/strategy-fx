import {test, expect} from './fixtures/auth'

test('creates a board, a column, and a card on it', async ({page, account}) => {
  // Chains two slow SSR page loads (project page, then board page) against
  // the E2E in-memory Mongo, plus three form submissions in between — see
  // e2e/project.spec.ts for the same getServerSideProps slowness on the
  // project page alone (20s+ observed there).
  test.setTimeout(120_000)

  await page.goto('/member')

  // --- Create a project, then open it ---
  await page.getByRole('button', {name: 'create-project'}).click()
  await page.getByLabel('New Project').fill('E2E Board Item Project')
  await page.getByRole('button', {name: 'save'}).click()

  const projectCreatedSnackbar = page.getByText('Project created')
  await expect(projectCreatedSnackbar).toBeVisible()
  // Snackbar is bottom-right and can overlap the grid — wait for it to
  // clear before clicking, or the click can land on the snackbar instead.
  await expect(projectCreatedSnackbar).toBeHidden()

  const projectTile = page.getByRole('button', {name: 'E2E Board Item Project'})
  await expect(projectTile).toBeVisible()
  await projectTile.click()
  await expect(page).toHaveURL(/\/member\/projects\/[^/]+$/, {timeout: 30_000})

  // --- Create a board, then open it ---
  await page.getByRole('button', {name: 'create-board'}).click()
  await page.getByLabel('New Board').fill('E2E Test Board')
  await page.getByRole('button', {name: 'save'}).click()

  const boardCreatedSnackbar = page.getByText('Board created')
  await expect(boardCreatedSnackbar).toBeVisible()
  await expect(boardCreatedSnackbar).toBeHidden()

  const boardTile = page.getByRole('button', {name: 'E2E Test Board'})
  await expect(boardTile).toBeVisible()
  await boardTile.click()
  await expect(page).toHaveURL(/\/member\/projects\/[^/]+\/boards\/[^/]+$/, {timeout: 30_000})

  // --- Create a column ---
  await page.getByRole('button', {name: 'create-column'}).click()
  await page.getByLabel('New Column').fill('E2E Test Column')
  await page.getByRole('button', {name: 'save'}).click()

  const columnCreatedSnackbar = page.getByText('Column created')
  await expect(columnCreatedSnackbar).toBeVisible()
  await expect(columnCreatedSnackbar).toBeHidden()
  await expect(page.getByText('E2E Test Column')).toBeVisible()

  // --- Create a card in that column ---
  await page.getByRole('button', {name: 'create-item'}).click()
  await page.getByLabel('New Card').fill('E2E Test Card')
  await page.getByRole('button', {name: 'save'}).click()

  const itemCreatedSnackbar = page.getByText('Item created')
  await expect(itemCreatedSnackbar).toBeVisible()
  await expect(itemCreatedSnackbar).toBeHidden()
  // react-beautiful-dnd wraps each card in its own role="button" draggable
  // div with the same accessible name as the actual title button inside
  // it — scope to the native <button> tag to avoid matching both.
  await expect(page.locator('button', {hasText: 'E2E Test Card'})).toBeVisible()
})
