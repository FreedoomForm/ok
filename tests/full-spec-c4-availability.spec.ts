import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// C4 gates: the enabled/disabled workspace modes narrow the resource lists to
// the matching availability state (R15), and the universal enable/disable
// applies to the selected day/period through the availability engine (R14) —
// the calendar and the lists reflect the applied state.

async function signInMiddleAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('enabled/disabled modes filter the client list and apply the state to the calendar', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const activePhone = `+99893${nonce.replace(/\D/g, '').padEnd(7, '4').slice(0, 7)}`
  const inactivePhone = `+99894${nonce.replace(/\D/g, '').padEnd(7, '5').slice(0, 7)}`
  const activeName = `Browser Enabled Client ${nonce}`
  const inactiveName = `Browser Disabled Client ${nonce}`
  const db = new PrismaClient()
  const createdIds: string[] = []
  try {
    await signInMiddleAdmin(page)
    const base = { address: 'Tashkent, availability street 1', calories: 1200, planType: 'CLASSIC', dailyPrice: 84000, deliveryDays: {}, autoOrdersEnabled: true }
    const created = await page.request.post('/api/admin/clients', { data: { ...base, name: activeName, phone: activePhone, isActive: true } })
    const created2 = await page.request.post('/api/admin/clients', { data: { ...base, name: inactiveName, phone: inactivePhone, isActive: false } })
    expect(created.status()).toBe(200)
    expect(created2.status()).toBe(200)
    const ids = (await Promise.all([created.json(), created2.json()])).map((payload) => payload.client?.id as string)
    createdIds.push(...ids.filter(Boolean))

    // Reload so the clients roster picks up the rows created above.
    await page.reload()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="clients"]').click()

    // Enabled mode: the calendar window opens first (separate window per the
    // spec); closing it returns to the list narrowed to the active clients.
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="enable"]').click()
    await expect(page.locator('[data-reference-calendar-window="true"]')).toBeVisible()
    await page.locator('[data-reference-calendar-window="true"]').getByRole('button').filter({ hasText: '×' }).click()
    const list = page.locator('[data-reference-content-root="clients"]')
    await expect(list.getByRole('checkbox', { name: `Select client ${activeName}` })).toBeVisible()
    await expect(list.getByRole('checkbox', { name: `Select client ${inactiveName}` })).toHaveCount(0)

    // Select the active client and apply the state through the local Save —
    // the availability engine records the day for the calendar.
    await list.getByRole('checkbox', { name: `Select client ${activeName}` }).check()
    const applyResponse = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().includes('/api/admin/resource-availability'))
    await page.getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()
    const applied = await applyResponse
    expect(applied.ok()).toBe(true)

    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const check = await page.request.get(`/api/admin/resource-availability?resourceType=CLIENT&resourceId=${createdIds[0]}&from=${iso}&to=${iso}`)
    expect(check.ok()).toBe(true)
    const availability = await check.json()
    const entries = Array.isArray(availability) ? availability : availability?.overrides ?? availability?.days ?? []
    expect(JSON.stringify(entries)).toContain('ENABLED')

    // Disabled mode (the Save already exited the previous mode — one key press
    // re-arms): only the inactive client stays visible.
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="disable"]').click()
    await expect(page.locator('[data-reference-calendar-window="true"]')).toBeVisible()
    await page.locator('[data-reference-calendar-window="true"]').getByRole('button').filter({ hasText: '×' }).click()
    await expect(list.getByRole('checkbox', { name: `Select client ${inactiveName}` })).toBeVisible()
    await expect(list.getByRole('checkbox', { name: `Select client ${activeName}` })).toHaveCount(0)
  } finally {
    if (createdIds.length > 0) {
      await db.customer.deleteMany({ where: { id: { in: createdIds } } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})
