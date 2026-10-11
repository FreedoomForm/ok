import { test, expect } from '@playwright/test'

// The two tests share the scheduler and the day-list notification state — run
// them one after another.
test.describe.configure({ mode: 'serial' })
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

// C6 gates: the client editor dialog grows the contract window — responsible
// courier, paid flag and the period picked in a calendar — and saving the
// client creates the first ContractPeriod in the same transaction (R8). The
// scheduler notifies the assigned courier with the day's order list (R8/R10)
// and the courier sees those orders (effective-period courier, R8).

function dayDate(offset: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}

function isoDay(offset: number): string {
  const date = dayDate(offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const WEEKDAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

async function signInMiddleAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('client create with contract window builds the period and shows the amber calendar', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const clientName = `Contract Window Client ${nonce}`
  const phone = `+99896${nonce.replace(/\D/g, '').padEnd(7, '7').slice(0, 7)}`
  const db = new PrismaClient()
  const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
  const courier = await db.admin.create({ data: { email: `browser-c6-window-${nonce.replace(/\W/g, '')}@example.com`, password: await bcrypt.hash('browser-c6', 10), name: `Window Courier ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
  console.log('CREATED COURIER ID:', courier.id)
  let watchStop = false
  const watcher = (async () => {
    for (let tick = 0; !watchStop; tick++) {
      const row = await db.admin.findUnique({ where: { id: courier.id }, select: { id: true } })
      if (!row) { console.log('COURIER GONE AT TICK', tick); return }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  })()
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    await signInMiddleAdmin(page)
    await page.reload()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="clients"]').click()

    // Open the client dialog and fill the required fields.
    await page.getByTestId('client-create-button').click()
    await page.locator('#clientName').fill(clientName)
    await page.locator('#clientPhone').fill(phone)
    await page.locator('#clientAddress').fill('Tashkent, contract window street 9')

    // Delivery days: today's weekday only — the contract serves exactly it.
    const todayWeekdayLabel = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
    await page.getByRole('checkbox', { name: todayWeekdayLabel }).check()

    // Contract window: courier, paid, period via the calendar quick-range.
    const dialog = page.locator('[data-reference-contract-window="true"]')
    await dialog.locator('[data-reference-contract-courier="true"]').click()
    await page.getByRole('option', { name: `Window Courier ${nonce}` }).click()
    await dialog.locator('[data-reference-contract-paid="true"]').check()
    await dialog.getByRole('button', { name: /Период не выбран|Davr tanlanmagan/ }).click()
    await page.getByRole('button', { name: /Эта неделя|Bu hafta/ }).click()
    await expect(dialog.getByRole('button', { name: /Период не выбран|Davr tanlanmagan/ })).toBeHidden()

    await page.getByRole('button', { name: /Создать|Yaratish/ }).last().click()
    await expect(page.getByTestId('client-create-button')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-reference-contract-window="true"]')).toBeHidden({ timeout: 15000 })

    // The client now owns a contract whose period mirrors the window.
    const customer = await db.customer.findFirst({ where: { name: clientName }, select: { id: true } })
    customerId = customer?.id
    expect(customerId).toBeTruthy()
    const contract = await db.contract.findFirst({ where: { customerId: customerId! }, include: { periods: true } })
    expect(contract).toBeTruthy()
    contractId = contract!.id
    expect(contract!.status).toBe('ENABLED')
    expect(contract!.paid).toBe(true)
    expect(contract!.periods[0]?.courierId).toBe(courier.id)
    expect(contract!.periods[0]?.autoRenew).toBe(true)
    const weekday = WEEKDAY_KEYS[new Date().getDay()]
    expect(contract!.periods[0]?.enabledWeekdays).toContain(weekday)

    // The contracts calendar shows the amber enabled contract day.
    await page.locator('[data-reference-page="contracts"]').click()
    const row = page.locator(`[data-reference-resource-row="contracts"][data-resource-id="${contractId}"]`)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Expand' }).click()
    const calendar = row.locator('[data-reference-calendar="true"]')
    await expect(calendar).toBeVisible()
    await expect(calendar.locator(`[data-calendar-date="${isoDay(0)}"]`)).toHaveAttribute('data-effective-state', 'ENABLED')
    await expect(calendar.locator(`[data-calendar-date="${isoDay(0)}"]`)).toHaveClass(/bg-amber-100/)
  } finally {
    watchStop = true
    await watcher.catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.admin.delete({ where: { id: courier.id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('scheduler notifies the assigned courier with the day list and the courier sees the orders', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const clientName = `C6 Daylist Client ${nonce}`
  const courierEmail = `browser-c6-daylist-${nonce.replace(/\W/g, '')}@example.com`
  const todayKey = isoDay(0)
  const todayDelivery = DAY_KEYS[new Date().getDay()]
  let customerId: string | undefined
  let courierId: string | undefined
  let contractId: string | undefined
  let ownerAdminId: string | undefined
  const createdOrderIds: string[] = []
  try {
    await signInMiddleAdmin(page)
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    ownerAdminId = owner.id
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash('browser-c6', 10), name: `Daylist Courier ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    courierId = courier.id

    // The client window payload as the dialog sends it: today's weekday only,
    // the responsible courier and a period covering today.
    const created = await page.request.post('/api/admin/clients', {
      data: {
        name: clientName,
        phone: `+196${String(Date.now()).slice(-7)}`,
        address: 'Tashkent, c6 daylist street 3',
        calories: 1400,
        planType: 'CLASSIC',
        dailyPrice: 90000,
        deliveryDays: { [todayDelivery]: true },
        autoOrdersEnabled: true,
        isActive: true,
        contract: {
          courierId,
          paid: true,
          startDate: todayKey,
          endDate: isoDay(6),
        },
      },
    })
    expect(created.status()).toBe(200)
    customerId = ((await created.json()).client?.id as string | undefined) ?? undefined
    expect(customerId).toBeTruthy()

    // The scheduler creates today's auto-order through the effective period
    // courier and posts the day list to the courier's chat.
    const cron = await page.request.get('/api/cron/scheduler', { headers: { authorization: `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}` } })
    expect(cron.status()).toBe(200)

    const todayEnd = dayDate(0)
    todayEnd.setHours(23, 59, 59, 999)
    const [courierOrders, dayListMessages] = await Promise.all([
      db.order.findMany({ where: { customerId: customerId!, courierId, deliveryDate: { gte: dayDate(0), lte: todayEnd } }, select: { id: true, courierId: true } }),
      db.message.findMany({ where: { systemCode: `COURIER_DAY_LIST:${todayKey}` }, select: { id: true, content: true, senderId: true } }),
    ])
    expect(courierOrders.length).toBeGreaterThanOrEqual(1)
    createdOrderIds.push(...courierOrders.map((order) => order.id))
    expect(dayListMessages.length).toBeGreaterThanOrEqual(1)
    expect(dayListMessages.some((message) => message.content.includes(clientName))).toBe(true)

    const contract = await db.contract.findFirst({ where: { customerId: customerId! }, select: { id: true } })
    contractId = contract?.id

    // The courier portal lists the order for today.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill('browser-c6')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/$|)/)
    const listResponse = await page.request.get(`/api/courier/orders?from=${todayKey}&to=${todayKey}`)
    expect(listResponse.status()).toBe(200)
    const visible = (await listResponse.json()) as Array<{ id: string }>
    expect(createdOrderIds.some((id) => visible.some((row) => row.id === id))).toBe(true)
  } finally {
    if (createdOrderIds.length > 0) await db.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) {
      await db.message.deleteMany({ where: { systemCode: { startsWith: 'COURIER_DAY_LIST:' }, senderId: ownerAdminId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})
