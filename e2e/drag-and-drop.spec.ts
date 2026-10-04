import {test, expect} from './fixtures/auth'

test('drags a card from one column into another', async ({page, account}) => {
  // Chains a project + board page load, two column creations, two item
  // creations, and a drag — generous headroom given e2e/board-item.spec.ts
  // already needed 120s for a shorter version of this same chain.
  test.setTimeout(150_000)

  await page.goto('/member')

  // --- Create a project, then open it ---
  await page.getByRole('button', {name: 'create-project'}).click()
  await page.getByLabel('New Project').fill('E2E Drag Drop Project')
  await page.getByRole('button', {name: 'save'}).click()

  const projectCreatedSnackbar = page.getByText('Project created')
  await expect(projectCreatedSnackbar).toBeVisible()
  await expect(projectCreatedSnackbar).toBeHidden()

  const projectTile = page.getByRole('button', {name: 'E2E Drag Drop Project'})
  await expect(projectTile).toBeVisible()
  await projectTile.click()
  await expect(page).toHaveURL(/\/member\/projects\/[^/]+$/, {timeout: 30_000})

  // --- Create a board, then open it ---
  await page.getByRole('button', {name: 'create-board'}).click()
  await page.getByLabel('New Board').fill('E2E Drag Drop Board')
  await page.getByRole('button', {name: 'save'}).click()

  const boardCreatedSnackbar = page.getByText('Board created')
  await expect(boardCreatedSnackbar).toBeVisible()
  await expect(boardCreatedSnackbar).toBeHidden()

  const boardTile = page.getByRole('button', {name: 'E2E Drag Drop Board'})
  await expect(boardTile).toBeVisible()
  await boardTile.click()
  await expect(page).toHaveURL(/\/member\/projects\/[^/]+\/boards\/[^/]+$/, {timeout: 30_000})

  // --- Create column A, then a card in it (only one "create-item" button
  // exists yet, so this click is unambiguous before column B appears) ---
  await page.getByRole('button', {name: 'create-column'}).click()
  await page.getByLabel('New Column').fill('E2E Column A')
  await page.getByRole('button', {name: 'save'}).click()
  await expect(page.getByText('Column created')).toBeVisible()
  await expect(page.getByText('Column created')).toBeHidden()
  await expect(page.getByText('E2E Column A')).toBeVisible()

  await page.getByRole('button', {name: 'create-item'}).click()
  await page.getByLabel('New Card').fill('E2E Card A')
  await page.getByRole('button', {name: 'save'}).click()
  await expect(page.getByText('Item created')).toBeVisible()
  await expect(page.getByText('Item created')).toBeHidden()

  const cardA = page.locator('button', {hasText: 'E2E Card A'})
  await expect(cardA).toBeVisible()

  // --- Create column B, then a card in it. Two "create-item" buttons
  // exist now (one per column, left to right in creation order) — use
  // the second one so the card lands in column B, not column A. ---
  await page.getByRole('button', {name: 'create-column'}).click()
  await page.getByLabel('New Column').fill('E2E Column B')
  await page.getByRole('button', {name: 'save'}).click()
  await expect(page.getByText('Column created')).toBeVisible()
  await expect(page.getByText('Column created')).toBeHidden()
  await expect(page.getByText('E2E Column B')).toBeVisible()

  await page.getByRole('button', {name: 'create-item'}).nth(1).click()
  await page.getByLabel('New Card').fill('E2E Card B')
  await page.getByRole('button', {name: 'save'}).click()
  await expect(page.getByText('Item created')).toBeVisible()
  await expect(page.getByText('Item created')).toBeHidden()

  const cardB = page.locator('button', {hasText: 'E2E Card B'})
  await expect(cardB).toBeVisible()

  // --- Drag card A onto card B, moving it from column A into column B ---
  // react-beautiful-dnd ignores native HTML5 drag events and Playwright's
  // dragTo()/dragAndDrop(), so the drag is driven with raw mouse events:
  // press, a small move to cross RBD's drag-start threshold, then a
  // multi-step move to the destination before releasing.
  const sourceBox = await cardA.boundingBox()
  const destBox = await cardB.boundingBox()
  if (!sourceBox || !destBox) throw new Error('Could not measure card bounding boxes to drag')

  const sourceX = sourceBox.x + sourceBox.width / 2
  const sourceY = sourceBox.y + sourceBox.height / 2
  const destX = destBox.x + destBox.width / 2
  const destY = destBox.y + destBox.height / 2

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(sourceX + 10, sourceY + 10)
  await page.mouse.move(destX, destY, {steps: 20})
  await page.mouse.up()

  const cardsReorderedSnackbar = page.getByText('Cards Reordered')
  await expect(cardsReorderedSnackbar).toBeVisible()

  // Both cards still exist, and card A's horizontal position has moved
  // from column A's x-range into column B's (roughly matching card B's x)
  // — proof it actually crossed columns, not just re-rendered in place.
  await expect(cardA).toBeVisible()
  await expect(cardB).toBeVisible()

  const cardANewBox = await cardA.boundingBox()
  if (!cardANewBox) throw new Error('Could not measure card A bounding box after the drag')

  expect(cardANewBox.x).toBeGreaterThan(sourceBox.x + sourceBox.width)
  expect(Math.abs(cardANewBox.x - destBox.x)).toBeLessThan(destBox.width)
})
