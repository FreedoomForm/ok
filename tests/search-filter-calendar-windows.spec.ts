import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// Addendum §3.2/§16 + R16: the universal Search command is the round button
// that expands in place into a popover with two universal actions — Filter and
// Calendar. The Filter and Calendar windows themselves open as separate windows
// exactly as before (they replace each other, no competing stacked panels), the
// Filter window/key toggles a column through its own key grammar.
test('universal search expands in place into filter and calendar actions', async ({ page }, testInfo) => {
  const db = new PrismaClient()
  const nonce = randomUUID().slice(0, 8)
  const name = `Browser search window ${nonce}`
  let itemId: string | undefined
  try {
    const item = await db.warehouseItem.create({
      data: { name, amount: 3, unit: 'kg', kcalPerGram: 1, pricePerUnit: 90, priceUnit: 'kg', isActive: true },
    })
    itemId = item.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    await page.locator('[data-reference-page="ingredients"]').click()
    const row = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${itemId}"]`)
    await expect(row).toBeVisible()

    // Select the row first: the Calendar window must then resolve the selected
    // resource instead of showing the honest empty state.
    await row.getByRole('checkbox').check()
    await expect(row.getByRole('checkbox')).toBeChecked()

    // Universal Search (round button) expands in place into the popover.
    await page.locator('[data-reference-command="search"]').click()
    const searchPopover = page.locator('[data-reference-search-popover="true"]')
    await expect(searchPopover).toBeVisible()

    // Inside the expansion: the separate Filter window — the LEFT window next
    // to the list, not a content replacement (R17).
    await searchPopover.locator('[data-reference-search-action="filter"]').click()
    const filterWindow = page.locator('[data-reference-filter-window="true"]')
    await expect(filterWindow).toBeVisible()
    await expect(searchPopover).toHaveCount(0)
    await expect(page.locator('[data-reference-filter-layout="true"]')).toBeVisible()
    await expect(page.locator('[data-reference-resource-row="ingredients"]').first()).toBeVisible()
    await expect(filterWindow.locator('[data-reference-filter-key="true"]')).toBeVisible()

    const firstColumn = filterWindow.locator('[data-filter-column]').first()
    const firstColumnToggle = firstColumn.locator('button').first()
    const firstColumnState = firstColumn.locator('[data-filter-column-state]')
    const initialState = await firstColumnState.getAttribute('data-filter-column-state')
    await firstColumnToggle.click()
    await expect(firstColumnState).toHaveAttribute('data-filter-column-state', initialState === 'enabled' ? 'disabled' : 'enabled')
    await expect(firstColumnState).toContainText(initialState === 'enabled' ? /Отключено|O.ochirilgan/i : /Включено|Yoqilgan/i)

    // Restore the column and type the exact per-column search (key disarmed):
    // the list filters precisely by that column.
    await firstColumnToggle.click()
    await expect(firstColumnState).toHaveAttribute('data-filter-column-state', initialState ?? 'enabled')
    const exactInput = firstColumn.locator('[data-filter-column-input]')
    if (await exactInput.count() > 0) {
      await exactInput.fill('nothing-matches-this-column-input')
      await expect(page.locator('[data-reference-resource-row="ingredients"]')).toHaveCount(0)
      await exactInput.fill(name)
      await expect(page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${itemId}"]`)).toBeVisible()
    }

    // Save closes the filter window and returns to the workspace.
    await filterWindow.getByRole('button', { name: /Сохранить|Saqlash/i }).click()
    await expect(filterWindow).toHaveCount(0)

    // The round search button re-expands into the same two actions.
    await page.locator('[data-reference-command="search"]').click()
    await expect(page.locator('[data-reference-search-popover="true"]')).toBeVisible()

    // Inside the expansion: the separate Calendar window driven by the
    // selected ingredient row.
    await page.locator('[data-reference-search-popover="true"]').locator('[data-reference-search-action="calendar"]').click()
    const calendarWindow = page.locator('[data-reference-calendar-window="true"]')
    await expect(calendarWindow).toBeVisible()
    await expect(page.locator('[data-reference-search-popover="true"]')).toHaveCount(0)
    await expect(filterWindow).toHaveCount(0)
    await expect(calendarWindow.locator('[data-reference-calendar="true"]')).toBeVisible()

    // Close returns to the workspace: no auxiliary window may linger.
    await calendarWindow.getByRole('button').filter({ hasText: '×' }).click()
    await expect(calendarWindow).toHaveCount(0)

    await testInfo.attach('search-filter-calendar-windows.png', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })
  } finally {
    await db.warehouseItem.deleteMany({ where: { OR: [{ id: itemId ?? '' }, { name }] } })
    await db.$disconnect()
    void testInfo
  }
})
