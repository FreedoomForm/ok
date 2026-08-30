import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// Addendum §3.2/§16: the universal Search command opens the search window, and
// the search window's interior contains the separate Filter and Calendar
// windows. The three windows replace each other (no competing stacked panels),
// the Filter window/key toggles a column through its own key grammar, and the
// uncommitted search draft survives the Filter/Calendar round trip (§3.1).
test('universal search opens the separate filter and calendar windows', async ({ page }, testInfo) => {
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

    // Universal Search without the key opens the search window.
    await page.locator('[data-reference-command="search"]').click()
    const searchWindow = page.locator('[data-reference-search-window="true"]')
    await expect(searchWindow).toBeVisible()
    const searchInput = searchWindow.getByRole('textbox').first()
    await searchInput.fill(name)
    await expect(searchInput).toHaveValue(name)

    // Inside the search window: the separate Filter window with its own key.
    await searchWindow.getByRole('button', { name: /Фильтр|Filtr/i }).click()
    const filterWindow = page.locator('[data-reference-filter-window="true"]')
    await expect(filterWindow).toBeVisible()
    await expect(searchWindow).toHaveCount(0)
    await expect(filterWindow.locator('[data-reference-filter-key="true"]')).toBeVisible()

    const firstColumn = filterWindow.locator('[data-filter-column]').first()
    const firstColumnState = firstColumn.locator('[data-filter-column-state]')
    const initialState = await firstColumnState.getAttribute('data-filter-column-state')
    await firstColumn.click()
    await expect(firstColumnState).toHaveAttribute('data-filter-column-state', initialState === 'enabled' ? 'disabled' : 'enabled')
    await expect(firstColumnState).toContainText(initialState === 'enabled' ? /Отключено|O.ochirilgan/i : /Включено|Yoqilgan/i)

    // Save closes the filter window and returns to the workspace.
    await filterWindow.getByRole('button', { name: /Сохранить|Saqlash/i }).click()
    await expect(filterWindow).toHaveCount(0)

    // The uncommitted search draft survives the Filter round trip (§3.1).
    await page.locator('[data-reference-command="search"]').click()
    await expect(page.locator('[data-reference-search-window="true"]')).toBeVisible()
    await expect(searchInput).toHaveValue(name)

    // Inside the search window: the separate Calendar window driven by the
    // selected ingredient row.
    await page.locator('[data-reference-search-window="true"]').getByRole('button', { name: /Календарь|Kalendar/i }).click()
    const calendarWindow = page.locator('[data-reference-calendar-window="true"]')
    await expect(calendarWindow).toBeVisible()
    await expect(searchWindow).toHaveCount(0)
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
