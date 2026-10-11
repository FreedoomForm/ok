import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

// C8 gates: the contacts layer is a second left rail (R27, Sheet on narrow
// screens); a new account finds «Система» with the welcome message right
// after signup (R28/R31); the conversation header opens the details page with
// the provisioning messages and the action history (R31/R34); the create
// window is a separate window (R32); universal enable/disable maps to the
// contact state (R33).

const db = new PrismaClient()

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/(middle|super|low)-admin(?:\/|$)/, { timeout: 20000 })
}

function contactsLayer(page: import('@playwright/test').Page, narrow: boolean) {
  return narrow
    ? page.locator('[data-reference-chat-contacts-sheet-root="true"]')
    : page.locator('[data-reference-chat-contacts-rail="true"]')
}

function contactSquare(page: import('@playwright/test').Page, narrow: boolean, name: string) {
  return narrow
    ? page.locator(`[data-reference-chat-contact-square-narrow][aria-label="${name}"]`)
    : page.locator(`[data-reference-chat-contact-square][aria-label="${name}"]`)
}

async function openChatPage(page: import('@playwright/test').Page, narrow: boolean) {
  await page.locator('[data-reference-page="chat"]').click()
  if (narrow) {
    await expect(page.locator('[data-reference-chat-contacts-sheet-trigger="true"]')).toBeVisible({ timeout: 20000 })
  } else {
    await expect(page.locator('[data-reference-chat-contacts-rail="true"]')).toBeVisible({ timeout: 20000 })
  }
}

test('new account opens the chat with the provisioned System contact and welcome', async ({ page }) => {
  const narrow = (page.viewportSize()?.width ?? 1280) < 1024
  const nonce = randomUUID().slice(0, 8)
  const email = `c8-e2e-${nonce}@example.test`
  const password = 'c8-signup-pass'

  const signup = await page.request.post('/api/auth/signup', {
    data: { email, password, name: `C8 E2E ${nonce}` },
  })
  expect(signup.status()).toBe(201)

  try {
    await signIn(page, email, password)
    await openChatPage(page, narrow)

    // The contacts layer shows the System contact right away.
    if (narrow) {
      await page.locator('[data-reference-chat-contacts-sheet-trigger="true"]').click()
    }
    await expect(contactSquare(page, narrow, 'Система')).toBeVisible({ timeout: 15000 })
    await contactSquare(page, narrow, 'Система').click()

    // The welcome message is already there, with the account-creation moment.
    await expect(page.getByText(/Добро пожаловать в чат AutoFood/).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Аккаунт создан/).first()).toBeVisible()
  } finally {
    const admin = await db.admin.findUnique({ where: { email }, select: { id: true } })
    if (admin) {
      await db.message.deleteMany({ where: { conversation: { participant1Id: admin.id, participant2Id: admin.id } } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { participant1Id: admin.id, participant2Id: admin.id } }).catch(() => undefined)
      await db.chatContact.deleteMany({ where: { ownerAdminId: admin.id } }).catch(() => undefined)
      await db.admin.delete({ where: { id: admin.id } }).catch(() => undefined)
    }
  }
})

test('create window makes the contact, provisioning message appears, disabled contact cannot write, details open', async ({ page }) => {
  test.setTimeout(120000)
  const narrow = (page.viewportSize()?.width ?? 1280) < 1024
  const nonce = randomUUID().slice(0, 8)
  const middle = await db.admin.findUniqueOrThrow({
    where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' },
    select: { id: true },
  })
  const courier = await db.admin.create({
    data: {
      email: `browser-c8-courier-${nonce}@example.com`,
      password: await bcrypt.hash('browser-c8', 10),
      name: `C8 Contact ${nonce}`,
      role: 'COURIER',
      createdBy: middle.id,
      isActive: true,
      hasPassword: true,
      phone: `+99890${nonce.replace(/\D/g, '').slice(-7).padStart(7, '1')}`,
    },
    select: { id: true, phone: true },
  })
  const contactName = `C8 Contact ${nonce}`

  try {
    await signIn(page, process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com', process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await openChatPage(page, narrow)

    // R32: the separate creation window with the unused-shades palette.
    if (narrow) {
      await page.locator('[data-reference-chat-contacts-sheet-trigger="true"]').click()
      await page.locator('[data-reference-chat-contact-create-narrow="true"]').click()
    } else {
      await page.locator('[data-reference-chat-contact-create="true"]').click()
    }
    const createWindow = page.locator('[data-reference-contact-create-window="true"]')
    await expect(createWindow).toBeVisible()
    await createWindow.getByLabel('Имя').fill(contactName)
    await createWindow.getByLabel('Телефон').fill(courier.phone ?? '')
    await createWindow.getByRole('button', { name: 'Создать' }).click()
    await expect(createWindow).toBeHidden({ timeout: 15000 })

    // R27: the new contact appears on the layer with its own color square.
    if (narrow) {
      // The create flow closed the sheet — reopen it to see the new square.
      await page.locator('[data-reference-chat-contacts-sheet-trigger="true"]').click()
    }
    await expect(contactSquare(page, narrow, contactName)).toBeVisible({ timeout: 15000 })

    // R31: opening the contact shows the provisioning system message on the right.
    await contactSquare(page, narrow, contactName).click()
    await expect(page.getByText(/Контакт создан\. Аккаунт C8 Contact/).first()).toBeVisible({ timeout: 15000 })

    // Disable the contact from the header → writing is blocked.
    await page.getByRole('button', { name: 'Отключить контакт' }).click()
    const composer = page.getByPlaceholder(/Напишите сообщение|Контакт отключен/)
    await expect(composer).toBeDisabled({ timeout: 15000 })

    // R31/R34: the clickable header opens the details page — profile,
    // provisioning messages and the action history.
    await page.locator('[data-reference-chat-conversation-header="true"]').click()
    const details = page.locator('[data-reference-chat-contact-details="true"]')
    await expect(details).toBeVisible({ timeout: 15000 })
    await expect(details.getByText(contactName).first()).toBeVisible()
    await expect(details.getByText(/Контакт создан|Системные сообщения/).first()).toBeVisible()
    // R34: the action history card sits next to the profile card in the sheet.
    await expect(page.getByText(/Updated chat contact/).first()).toBeVisible()
  } finally {
    await db.chatContact.deleteMany({ where: { ownerAdminId: middle.id, adminId: courier.id } }).catch(() => undefined)
    await db.conversation.deleteMany({ where: { OR: [{ participant1Id: middle.id, participant2Id: courier.id }, { participant1Id: courier.id, participant2Id: middle.id }] } }).catch(() => undefined)
    await db.message.deleteMany({ where: { conversation: { OR: [{ participant1Id: middle.id, participant2Id: courier.id }, { participant1Id: courier.id, participant2Id: middle.id }] } } }).catch(() => undefined)
    await db.admin.delete({ where: { id: courier.id } }).catch(() => undefined)
  }
})

test('universal disable maps to the contact state, not availability rows', async ({ page }) => {
  test.setTimeout(120000)
  const narrow = (page.viewportSize()?.width ?? 1280) < 1024
  const nonce = randomUUID().slice(0, 8)
  const middle = await db.admin.findUniqueOrThrow({
    where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' },
    select: { id: true },
  })
  const courier = await db.admin.create({
    data: {
      email: `browser-c8-uni-${nonce}@example.com`,
      password: await bcrypt.hash('browser-c8', 10),
      name: `C8 Universal ${nonce}`,
      role: 'COURIER',
      createdBy: middle.id,
      isActive: true,
      hasPassword: true,
      phone: `+99891${nonce.replace(/\D/g, '').slice(-7).padStart(7, '2')}`,
    },
    select: { id: true },
  })
  const contact = await db.chatContact.create({
    data: {
      ownerAdminId: middle.id,
      adminId: courier.id,
      type: 'ADMIN',
      state: 'ENABLED',
      name: `C8 Universal ${nonce}`,
      phone: `+99891${nonce.replace(/\D/g, '').slice(-7).padStart(7, '2')}`,
      color: '#2563eb',
      icon: 'truck',
    },
    select: { id: true },
  })

  try {
    await signIn(page, process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com', process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await openChatPage(page, narrow)

    // Select the contact row, then the universal disable command.
    await page.getByRole('checkbox', { name: `Выбрать C8 Universal ${nonce}` }).check()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="disable"]').click()
    await expect(page.locator('[data-reference-calendar-window="true"]')).toBeVisible()
    await page.locator('[data-reference-calendar-window="true"]').getByRole('button').filter({ hasText: '×' }).click()
    await page.getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()

    // The contact STATE flipped; no availability rows were written.
    await expect.poll(async () => {
      const row = await db.chatContact.findUnique({ where: { id: contact.id }, select: { state: true } })
      return row?.state
    }, { timeout: 20000 }).toBe('DISABLED')
    const availabilityRows = await db.resourceAvailability.count({ where: { resourceType: 'CHAT_CONTACT', resourceId: contact.id } })
    assertEqual(availabilityRows, 0)
  } finally {
    await db.chatContact.deleteMany({ where: { id: contact.id } }).catch(() => undefined)
    await db.conversation.deleteMany({ where: { OR: [{ participant1Id: middle.id, participant2Id: courier.id }, { participant1Id: courier.id, participant2Id: middle.id }] } }).catch(() => undefined)
    await db.admin.delete({ where: { id: courier.id } }).catch(() => undefined)
  }
})

function assertEqual(actual: number, expected: number) {
  if (actual !== expected) throw new Error(`Expected ${expected} availability rows, got ${actual}`)
}
