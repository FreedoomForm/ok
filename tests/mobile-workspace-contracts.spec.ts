import { test, expect, type Page } from '@playwright/test'

// Addendum §16 browser-mobile row: "no hidden duplicate panels; hitboxes
// remain reachable; bottom actions do not cover content; tables and rails
// scroll correctly; active selection remains visible". This regression pins
// each of those contracts against the live workspace on both projects.

async function signInMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('mobile workspace keeps hitboxes reachable, content unoccluded and selection visible', async ({ page }, testInfo) => {
  await signInMiddleAdmin(page)

  // No hidden duplicate panels: exactly one visible page rail and one visible
  // command strip instance.
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(16)
  await expect(page.locator('[data-reference-command]:visible')).toHaveCount(9)

  // Hitboxes remain reachable: rail entries keep at least a 44px touch target.
  const railButtons = page.locator('[data-reference-page-rail="true"] button')
  const railCount = await railButtons.count()
  expect(railCount).toBeGreaterThanOrEqual(16)
  for (let index = 0; index < railCount; index++) {
    const box = await railButtons.nth(index).boundingBox()
    expect(box?.height ?? 0, `rail hitbox ${index} height`).toBeGreaterThanOrEqual(44)
  }

  // Tables scroll correctly and the bottom local actions do not cover content:
  // open ingredients, select two rows, scroll to the very bottom, and the last
  // row's checkbox must still be the element receiving pointer events (not the
  // bottom action bar).
  await page.locator('[data-reference-page="ingredients"]').click()
  await expect(page.locator('[data-reference-resource-row="ingredients"]').first()).toBeVisible()
  const rows = page.locator('[data-reference-resource-row="ingredients"]')
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThanOrEqual(1)

  const lastRow = rows.nth(rowCount - 1)
  await lastRow.scrollIntoViewIfNeeded()
  const checkbox = lastRow.getByRole('checkbox')
  await checkbox.check()
  const box = await checkbox.boundingBox()
  expect(box).not.toBeNull()
  const covered = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y)
    const bar = document.querySelector('[data-reference-local-actions]')
    return Boolean(bar && (element === bar || bar.contains(element)))
  }, { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 })
  expect(covered, 'the bottom action bar must not cover the last table row').toBe(false)

  // Active selection remains visible after scrolling away and back.
  await page.locator('[data-reference-page="orders"]').click()
  await page.locator('[data-reference-page="ingredients"]').click()
  const restoredRow = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${await lastRow.getAttribute('data-resource-id')}"]`)
  await expect(restoredRow).toBeVisible()
  await expect(restoredRow.getByRole('checkbox')).toBeChecked()
  await restoredRow.scrollIntoViewIfNeeded()
  await expect(restoredRow.getByRole('checkbox')).toBeChecked()
  await expect(restoredRow.getByRole('checkbox')).toBeInViewport()

  await testInfo.attach('mobile-workspace-contracts.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})
