import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

// C5 gates (§3.3): disabling one day of a contract period cascades forward —
// the calendar turns every later day red until an explicit re-enable, and the
// courier stops seeing orders on the effectively disabled days (R18) unless an
// ORDER-level ENABLED override re-includes the row. The calendar also shows
// the amber enabled stretch, the courier-coloured band and the +7 renewal day.

function isoDay(offset: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dayDate(offset: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}

async function signInMiddleAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('disabling a contract day turns later days red via cascade and shows the +7 renewal day', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const clientName = `Cascade Calendar Client ${nonce}`
  const phone = `+99895${nonce.replace(/\D/g, '').padEnd(7, '6').slice(0, 7)}`
  const db = new PrismaClient()
  let contractId: string | undefined
  let customerId: string | undefined
  try {
    await signInMiddleAdmin(page)
    const base = { address: 'Tashkent, cascade street 5', calories: 1200, planType: 'CLASSIC', dailyPrice: 84000, deliveryDays: {}, autoOrdersEnabled: true }
    const created = await page.request.post('/api/admin/clients', { data: { ...base, name: clientName, phone, isActive: true } })
    expect(created.status()).toBe(200)
    customerId = ((await created.json()).client?.id as string | undefined) ?? undefined
    expect(customerId).toBeTruthy()

    const contractResponse = await page.request.post('/api/admin/contracts', {
      data: {
        customerId,
        autoRenew: true,
        period: {
          startDate: isoDay(0),
          endDate: isoDay(6),
          autoRenew: true,
          enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          disabledDates: [],
        },
      },
    })
    expect(contractResponse.status()).toBe(201)
    contractId = ((await contractResponse.json()).contract?.id as string | undefined) ?? undefined
    expect(contractId).toBeTruthy()

    await page.reload()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="contracts"]').click()
    const row = page.locator(`[data-reference-resource-row="contracts"][data-resource-id="${contractId}"]`)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Expand' }).click()

    const calendar = row.locator('[data-reference-calendar="true"]')
    await expect(calendar).toBeVisible()

    // Before the disable: every period day is an amber enabled contract day.
    await expect(calendar.locator(`[data-calendar-date="${isoDay(1)}"]`)).toHaveAttribute('data-effective-state', 'ENABLED')

    // Disable day +2: the day itself and every later day of the period go red
    // through the cascade — the spec's "days after the disabling day are not
    // active".
    await calendar.locator(`[data-calendar-date="${isoDay(2)}"]`).click()
    const disabledTile = calendar.locator(`[data-calendar-date="${isoDay(2)}"]`)
    await expect(disabledTile).toHaveAttribute('data-effective-state', 'DISABLED', { timeout: 15000 })
    await expect(disabledTile).toHaveClass(/bg-red-50/)
    const cascadedTile = calendar.locator(`[data-calendar-date="${isoDay(3)}"]`)
    await expect(cascadedTile).toHaveAttribute('data-effective-state', 'DISABLED', { timeout: 15000 })
    await expect(cascadedTile).toHaveAttribute('data-cascade', 'true')
    await expect(cascadedTile).toHaveClass(/bg-red-50/)
    await expect(calendar.locator(`[data-calendar-date="${isoDay(5)}"]`)).toHaveAttribute('data-effective-state', 'DISABLED')
    // The stretch before the disable stays amber.
    await expect(calendar.locator(`[data-calendar-date="${isoDay(1)}"]`)).toHaveAttribute('data-effective-state', 'ENABLED')
    await expect(calendar.locator(`[data-calendar-date="${isoDay(1)}"]`)).toHaveClass(/bg-amber-100/)

    // R11: with auto-renew on and the renewal week not written yet, the
    // virtual enabled extension day follows the period's end date.
    const renewalTile = calendar.locator('[data-virtual-marker="RENEWAL"]')
    await expect(renewalTile).toBeVisible()
    await expect(renewalTile).toHaveClass(/bg-amber-100/)
  } finally {
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('courier stops seeing orders on cascade-disabled days unless an ORDER override re-includes them', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const clientName = `Cascade Courier Client ${nonce}`
  const courierEmail = `browser-cascade-${nonce.replace(/\W/g, '')}@example.com`
  let customerId: string | undefined
  let courierId: string | undefined
  let contractId: string | undefined
  const orderIds: string[] = []
  try {
    await signInMiddleAdmin(page)
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash('browser-cascade', 10), name: `Cascade Courier ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    courierId = courier.id

    const base = { address: 'Tashkent, cascade courier street 7', calories: 1400, planType: 'CLASSIC', dailyPrice: 90000, deliveryDays: {}, autoOrdersEnabled: true }
    const created = await page.request.post('/api/admin/clients', { data: { ...base, name: clientName, phone: `+195${String(Date.now()).slice(-7)}`, isActive: true } })
    expect(created.status()).toBe(200)
    customerId = ((await created.json()).client?.id as string | undefined) ?? undefined
    expect(customerId).toBeTruthy()

    const contractResponse = await page.request.post('/api/admin/contracts', {
      data: {
        customerId,
        courierId,
        autoRenew: true,
        period: {
          startDate: isoDay(1),
          endDate: isoDay(7),
          courierId,
          autoRenew: true,
          enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          disabledDates: [],
        },
      },
    })
    expect(contractResponse.status()).toBe(201)
    contractId = ((await contractResponse.json()).contract?.id as string | undefined) ?? undefined
    expect(contractId).toBeTruthy()

    // Three dated orders inside the period: +1 stays enabled, +2 gets the
    // disabling override, +3 is disabled only through the cascade.
    for (const [index, offset] of [1, 2, 3].entries()) {
      const deliveryDate = dayDate(offset)
      deliveryDate.setHours(12, 0, 0, 0)
      const order = await db.order.create({
        data: {
          orderNumber: 940000000 + index + Number.parseInt(nonce.replace(/\D/g, '').slice(-6), 10),
          customerId: customerId!,
          adminId: owner.id,
          courierId,
          orderStatus: 'PENDING',
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
          deliveryAddress: 'Tashkent, cascade courier street 7',
          deliveryDate,
          deliveryTime: '12:00',
          quantity: 1,
          calories: 1600,
        },
        select: { id: true },
      })
      orderIds.push(order.id)
    }

    // Disable contract day +2 through the availability engine (admin session
    // owns the writes; the courier session below is read-only).
    const disableResponse = await page.request.put('/api/admin/resource-availability', {
      data: { resourceType: 'CONTRACT', resourceIds: [contractId], date: isoDay(2), state: 'DISABLED', reason: 'C5 cascade e2e' },
    })
    expect(disableResponse.status()).toBe(200)

    // Switch the browser session to the courier portal — the courier list API
    // answers COURIER sessions only.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill('browser-cascade')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/$|)/)

    const listResponse = await page.request.get(`/api/courier/orders?from=${isoDay(1)}&to=${isoDay(3)}`)
    expect(listResponse.status()).toBe(200)
    const visible = (await listResponse.json()) as Array<{ id: string }>
    const visibleIds = visible.map((order) => order.id)
    expect(visibleIds).toContain(orderIds[0]) // +1 untouched
    expect(visibleIds).not.toContain(orderIds[1]) // +2 exact disable
    expect(visibleIds).not.toContain(orderIds[2]) // +3 cascade only — new in C5

    // R18: an ORDER-level ENABLED override re-includes the suppressed row.
    await db.resourceAvailability.create({
      data: {
        resourceType: 'ORDER',
        resourceId: orderIds[2],
        date: dayDate(3),
        state: 'ENABLED',
        reason: 'C5 order re-include e2e',
      },
    })
    const retryResponse = await page.request.get(`/api/courier/orders?from=${isoDay(1)}&to=${isoDay(3)}`)
    const retryVisible = ((await retryResponse.json()) as Array<{ id: string }>).map((order) => order.id)
    expect(retryVisible).toContain(orderIds[2])
    expect(retryVisible).not.toContain(orderIds[1])
  } finally {
    if (orderIds.length > 0) await db.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})
