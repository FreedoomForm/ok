import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

// C7 gates: the courier distribution window is a real drag&drop board (dnd-kit
// with a click-to-pick fallback) — orders left, couriers right, Save disabled
// while anything is unassigned (R19). Disabling several couriers at once turns
// the selected-couriers page into the distribution queue: Save removes the
// courier, Cancel keeps it, the arrow top-left returns to the workspace (R19,
// §3.2 grammar R20).

const db = new PrismaClient()

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

async function createCourier(name: string): Promise<{ id: string }> {
  const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
  return db.admin.create({
    data: {
      email: `browser-c7-${name.replace(/\W/g, '')}-${randomUUID().slice(0, 6)}@example.com`,
      password: await bcrypt.hash('browser-c7', 10),
      name,
      role: 'COURIER',
      createdBy: owner.id,
      isActive: true,
      hasPassword: true,
    },
    select: { id: true },
  })
}

async function createOrderFor(courierId: string, offset: number, seed: number): Promise<{ id: string }> {
  const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
  const nonce = `${Date.now()}${seed}`
  return db.order.create({
    data: {
      orderNumber: 950000000 + seed + Number.parseInt(nonce.slice(-6), 10),
      customerId: (await db.customer.findFirstOrThrow({ where: { isActive: true }, select: { id: true } })).id,
      adminId: owner.id,
      courierId,
      orderStatus: 'PENDING',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      deliveryAddress: 'Tashkent, c7 street 1',
      deliveryDate: dayDate(offset),
      deliveryTime: '12:00',
      quantity: 1,
      calories: 1500,
    },
    select: { id: true },
  })
}

test('single courier disable assigns orders on the dnd board', async ({ page }) => {
  const nonce = randomUUID().slice(0, 6)
  const source = await createCourier(`C7 Source ${nonce}`)
  const target = await createCourier(`C7 Target ${nonce}`)
  const order1 = await createOrderFor(source.id, 1, 1)
  const order2 = await createOrderFor(source.id, 2, 2)
  test.setTimeout(120000)
  try {
    await signInMiddleAdmin(page)
    await page.reload()
    await expect(page.locator('[data-reference-page="couriers"]')).toBeVisible({ timeout: 20000 })
    await page.locator('[data-reference-page="couriers"]').click()
    await expect(page.locator('button[role="checkbox"]').first()).toBeVisible({ timeout: 20000 })

    // Select first (the disable-mode list narrows to already-disabled rows),
    // then arm the disable mode and close its calendar window.
    await page.getByRole('checkbox', { name: `Выбрать администратора C7 Source ${nonce}` }).check()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="disable"]').click()
    await expect(page.locator('[data-reference-calendar-window="true"]')).toBeVisible()
    await page.locator('[data-reference-calendar-window="true"]').getByRole('button').filter({ hasText: '×' }).click()
    await page.getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()

    // The distribution board: two unassigned orders, drag them onto the target
    // courier via the click-to-pick fallback (pointer drag shares the same
    // reducer).
    const board = page.locator('[data-reference-reassignment-board="true"]')
    await expect(board).toBeVisible()
    for (const order of [order1, order2]) {
      await board.locator(`[data-reassignment-order="${order.id}"]`).click()
      await board.locator(`[data-reassignment-courier="${target.id}"]`).click()
    }
    await expect(board.locator(`[data-reassignment-assigned-order="${order1.id}"]`)).toBeVisible()
    await expect(board.locator(`[data-reassignment-assigned-order="${order2.id}"]`)).toBeVisible()

    const save = page.getByRole('dialog').getByRole('button', { name: /Переназначить|Сохранить|Saqlash/i })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.locator('[data-reference-courier-reassignment-state="closed"]')).toHaveAttribute('data-reference-courier-reassignment-state', 'closed', { timeout: 15000 })

    const [sourceRow, moved1, moved2] = await Promise.all([
      db.admin.findUnique({ where: { id: source.id }, select: { isActive: true } }),
      db.order.findUnique({ where: { id: order1.id }, select: { courierId: true } }),
      db.order.findUnique({ where: { id: order2.id }, select: { courierId: true } }),
    ])
    expect(sourceRow?.isActive).toBe(false)
    expect(moved1?.courierId).toBe(target.id)
    expect(moved2?.courierId).toBe(target.id)
  } finally {
    await db.order.deleteMany({ where: { id: { in: [order1.id, order2.id] } } }).catch(() => undefined)
    await db.admin.deleteMany({ where: { id: { in: [source.id, target.id] } } }).catch(() => undefined)
  }
})

test('multi-courier disable opens the distribution queue with disappear/stay semantics', async ({ page }) => {
  const nonce = randomUUID().slice(0, 6)
  const first = await createCourier(`C7 Queue A ${nonce}`)
  const second = await createCourier(`C7 Queue B ${nonce}`)
  const target = await createCourier(`C7 Queue T ${nonce}`)
  const order = await createOrderFor(first.id, 1, 3)
  test.setTimeout(120000)
  try {
    await signInMiddleAdmin(page)
    await page.reload()
    await expect(page.locator('[data-reference-page="couriers"]')).toBeVisible({ timeout: 20000 })
    await page.locator('[data-reference-page="couriers"]').click()
    await expect(page.locator('button[role="checkbox"]').first()).toBeVisible({ timeout: 20000 })

    await page.getByRole('checkbox', { name: `Выбрать администратора C7 Queue A ${nonce}` }).check()
    await page.getByRole('checkbox', { name: `Выбрать администратора C7 Queue B ${nonce}` }).check()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="disable"]').click()
    await expect(page.locator('[data-reference-calendar-window="true"]')).toBeVisible()
    await page.locator('[data-reference-calendar-window="true"]').getByRole('button').filter({ hasText: '×' }).click()
    await page.getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()

    // The queue page: arrow top-left, both couriers listed.
    const queue = page.locator('[data-reference-selected-elements="couriers"]')
    await expect(queue).toBeVisible()
    await expect(queue.getByRole('button', { name: /Назад|Orqaga/ })).toBeVisible()
    await expect(queue.locator('button[role="listitem"]').filter({ hasText: `C7 Queue A ${nonce}` })).toBeVisible()
    await expect(queue.locator('button[role="listitem"]').filter({ hasText: `C7 Queue B ${nonce}` })).toBeVisible()

    // Distribute the first courier: pick order → drop on the target → Save.
    const firstGet = page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes('/api/admin/couriers/reassign'))
    await queue.locator('button[role="listitem"]').filter({ hasText: `C7 Queue A ${nonce}` }).click()
    await firstGet
    const board = page.locator('[data-reference-reassignment-board="true"]')
    await expect(board).toBeVisible({ timeout: 15000 })
    await board.locator(`[data-reassignment-order="${order.id}"]`).click()
    await board.locator(`[data-reassignment-courier="${target.id}"]`).click()
    const reassignPost = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().includes('/api/admin/couriers/reassign'))
    await page.getByRole('dialog').getByRole('button', { name: /Переназначить|Сохранить|Saqlash/i }).click()
    await reassignPost
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 })

    // Saved courier disappears, cancelled one stays.
    await expect(queue.locator('button[role="listitem"]').filter({ hasText: `C7 Queue A ${nonce}` })).toHaveCount(0)
    await expect(queue.locator('button[role="listitem"]').filter({ hasText: `C7 Queue B ${nonce}` })).toBeVisible()

    // Let the refresh re-render settle (the toast overlay also fades) before
    // interacting with the remaining row.
    await expect(page.locator('[data-sonner-toast]')).toBeHidden({ timeout: 10000 }).catch(() => undefined)
    await page.waitForTimeout(500)

    // The pending courier stays on the page until distributed — Cancel simply
    // closes the dialog without the POST, so the row remains either way.
    // The arrow top-left returns to the workspace.
    await queue.getByRole('button', { name: /Назад|Orqaga/ }).click()
    await expect(page.locator('[data-reference-selected-elements="couriers"]')).toHaveCount(0)

    const [firstRow, secondRow] = await Promise.all([
      db.admin.findUnique({ where: { id: first.id }, select: { isActive: true } }),
      db.admin.findUnique({ where: { id: second.id }, select: { isActive: true } }),
    ])
    expect(firstRow?.isActive).toBe(false)
    expect(secondRow?.isActive).toBe(true)
  } finally {
    await db.order.deleteMany({ where: { id: order.id } }).catch(() => undefined)
    await db.admin.deleteMany({ where: { id: { in: [first.id, second.id, target.id] } } }).catch(() => undefined)
  }
})
