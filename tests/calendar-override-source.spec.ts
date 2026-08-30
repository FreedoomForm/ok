import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// Addendum §5: the resource calendar must show the selected day or range, all
// explicit enabled/disabled dates, the state color AND the source of override.
// This regression persists an ingredient day override with a reason through
// the authorized API and asserts the resource calendar surfaces that source on
// the overridden day (title + aria text) on desktop and mobile.
test('resource calendar surfaces the source of a day override', async ({ page }, testInfo) => {
  const db = new PrismaClient()
  const nonce = randomUUID().slice(0, 8)
  const name = `Browser override source ${nonce}`
  const reason = `Universal workspace command ${nonce}`
  let itemId: string | undefined
  try {
    const item = await db.warehouseItem.create({
      data: { name, amount: 2, unit: 'kg', kcalPerGram: 1, pricePerUnit: 70, priceUnit: 'kg', isActive: true },
    })
    itemId = item.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    // Persist the day override with an explicit source reason.
    const target = new Date()
    target.setHours(0, 0, 0, 0)
    const isoDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    const put = await page.request.put('/api/admin/resource-availability', {
      data: { resourceType: 'INGREDIENT', resourceIds: [itemId], date: isoDate, state: 'DISABLED', reason },
    })
    expect(put.status()).toBe(200)

    // Select the ingredient row and open the calendar window through the
    // universal Search command (§3.2 auxiliary window path).
    await page.locator('[data-reference-page="ingredients"]').click()
    const row = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${itemId}"]`)
    await expect(row).toBeVisible()
    await row.getByRole('checkbox').check()
    await page.locator('[data-reference-command="search"]').click()
    await page.locator('[data-reference-search-window="true"]').getByRole('button', { name: /Календарь|Kalendar/i }).click()
    const calendarWindow = page.locator('[data-reference-calendar-window="true"]')
    await expect(calendarWindow).toBeVisible()
    const calendar = calendarWindow.locator('[data-reference-calendar="true"]')
    await expect(calendar).toBeVisible()

    // The overridden day carries the source of override.
    const overriddenDay = calendar.locator('button[data-override-source]').filter({ hasText: /Отключен|O'chirilgan/i })
    await expect(overriddenDay).toBeVisible()
    await expect(overriddenDay).toHaveAttribute('title', new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await expect(overriddenDay).toHaveAttribute('data-override-source', new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

    await testInfo.attach('calendar-override-source.png', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })
  } finally {
    if (itemId) {
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'INGREDIENT', resourceId: itemId } }).catch(() => undefined)
      await db.warehouseItem.deleteMany({ where: { id: itemId } }).catch(() => undefined)
    }
    await db.$disconnect()
    void testInfo
  }
})
