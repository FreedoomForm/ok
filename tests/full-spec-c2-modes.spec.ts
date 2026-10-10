import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// C2 gates: auto-SMS off leaves a SYSTEM message in the internal chat (R6),
// trash mode lists deleted orders/clients (R5), key+plus opens the universal
// creation rows page (R24), and key+edit scopes the action history to the
// selected client (R25).

async function signInMiddleAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('auto-SMS off turns the sms tile red and posts the system message into the chat', async ({ page }) => {
  await signInMiddleAdmin(page)

  // Key + SMS → auto-SMS on (green tile, key stays active). The workspace
  // previews the internal messenger dialog — close it to keep driving.
  await page.locator('[data-reference-command="key"]').click()
  await page.locator('[data-reference-command="sms"]').click()
  await expect(page.locator('[data-reference-command="sms"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-reference-sms-off="true"]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)

  // SMS again → auto-SMS off: the tile reads red while the key stays active.
  await page.locator('[data-reference-command="sms"]').click()
  await expect(page.locator('[data-reference-sms-off="true"]')).toHaveCount(1)
  await expect(page.locator('[data-reference-command="key"]')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)

  // The workspace left a SYSTEM message in the internal «Система» chat.
  await page.locator('[data-reference-page="chat"]').click()
  await expect(page.getByText(/Авто-отправка сообщений отключена|Avtomatik xabar yuborish o.chirildi/i).first()).toBeVisible({ timeout: 15000 })
})

test('universal creation page creates a client from the key+plus rows', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const clientName = `Browser Create Client ${nonce}`
  const phone = `+99890${nonce.replace(/\D/g, '').padEnd(7, '1').slice(0, 7)}`
  const db = new PrismaClient()
  try {
    await signInMiddleAdmin(page)

    await page.locator('[data-reference-page="clients"]').click()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const createMode = page.locator('[data-reference-create-mode="true"]')
    await expect(createMode).toBeVisible()

    // The last selected row is the creation row: open the client row.
    await page.locator('[data-reference-create-row="clients"]').click()
    const form = page.locator('[data-reference-create-form="clients"]')
    await expect(form).toBeVisible()
    await form.getByLabel(/Имя|Nomi/i).fill(clientName)
    await form.getByLabel(/Телефон|Telefon/i).fill(phone)
    await form.getByLabel(/Адрес|Manzil/i).fill('Tashkent, universal create street 1')
    await page.locator('[data-reference-create-submit="clients"]').click()
    await expect(page.locator('[data-reference-created-rows="true"]').getByText(clientName)).toBeVisible()

    const created = await db.customer.findFirst({ where: { phone }, select: { id: true, name: true } })
    expect(created?.name).toBe(clientName)
  } finally {
    await db.customer.deleteMany({ where: { phone } })
    await db.$disconnect()
  }
})

test('trash mode lists deleted clients and the restore pipeline is wired', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const phone = `+99891${nonce.replace(/\D/g, '').padEnd(7, '2').slice(0, 7)}`
  const clientName = `Browser Trash Client ${nonce}`
  const db = new PrismaClient()
  let clientId: string | undefined
  try {
    await signInMiddleAdmin(page)
    const created = await page.request.post('/api/admin/clients', {
      data: {
        name: clientName,
        phone,
        address: 'Tashkent, test street 1',
        calories: 1200,
        planType: 'CLASSIC',
        dailyPrice: 84000,
        deliveryDays: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
        autoOrdersEnabled: true,
        isActive: true,
        defaultCourierId: '',
        assignedSetId: '',
      },
    })
    expect(created.status()).toBe(200)
    const saved = await created.json()
    clientId = saved.client?.id
    expect(clientId).toEqual(expect.any(String))

    const removed = await page.request.delete('/api/admin/clients/delete', { data: { clientIds: [clientId] } })
    expect(removed.status()).toBe(200)

    await page.locator('[data-reference-page="clients"]').click()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    const trashList = page.locator('[data-reference-trash-list="clients"]')
    await expect(trashList).toBeVisible()
    await expect(trashList.locator(`[data-reference-trash-row="${clientId}"]`)).toBeVisible()
    await expect(trashList).toContainText(clientName)

    // Selection survives; the «+» restore path returns the client.
    await trashList.locator(`[data-reference-trash-row="${clientId}"]`).getByRole('checkbox').check()
    await page.locator('[data-reference-command="create"]').click()
    await expect(page.locator('[data-reference-trash-list="clients"]')).toHaveCount(0)
    await expect.poll(async () => {
      const row = await db.customer.findUnique({ where: { id: clientId! }, select: { deletedAt: true } })
      return row?.deletedAt ?? null
    }, { timeout: 10000 }).toBe(null)
  } finally {
    if (clientId) {
      await db.customer.deleteMany({ where: { id: clientId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('key+edit opens the action history scoped to the selected client', async ({ page }) => {
  const nonce = randomUUID().slice(0, 8)
  const clientName = `Browser History Client ${nonce}`
  const phone = `+99892${nonce.replace(/\D/g, '').padEnd(7, '3').slice(0, 7)}`
  const db = new PrismaClient()
  try {
    await signInMiddleAdmin(page)

    // Create through the universal creation page so the CREATE_CLIENT audit
    // row exists for the element-scoped history.
    await page.locator('[data-reference-page="clients"]').click()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="create"]').click()
    await page.locator('[data-reference-create-row="clients"]').click()
    const form = page.locator('[data-reference-create-form="clients"]')
    await form.getByLabel(/Имя|Nomi/i).fill(clientName)
    await form.getByLabel(/Телефон|Telefon/i).fill(phone)
    await form.getByLabel(/Адрес|Manzil/i).fill('Tashkent, universal history street 2')
    await page.locator('[data-reference-create-submit="clients"]').click()
    await expect(page.locator('[data-reference-created-rows="true"]').getByText(clientName)).toBeVisible()

    const created = await db.customer.findFirst({ where: { phone }, select: { id: true } })
    expect(created?.id).toEqual(expect.any(String))
    const clientId = created!.id

    // Exit the creation mode through the local «Назад» (cancel-mode), reload
    // so the clients list picks up the created row, then select it.
    await page.getByRole('button', { name: /Назад|Orqaga/i }).last().click()
    await expect(page.locator('[data-reference-create-mode="true"]')).toHaveCount(0)
    await page.reload()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="clients"]').click()
    await page.getByRole('checkbox', { name: `Select client ${clientName}` }).check()

    // Key + edit → the history scoped to the selected client shows the row.
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="edit"]').click()
    const history = page.locator('[data-reference-action-history="true"]')
    await expect(history).toBeVisible()
    await expect(history.getByText(clientName).first()).toBeVisible({ timeout: 15000 })
  } finally {
    await db.customer.deleteMany({ where: { phone } })
    await db.$disconnect()
  }
})
