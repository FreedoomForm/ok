import { test, expect, type Page } from '@playwright/test'

const COMMAND_ORDER = ['key', 'search', 'create', 'enable', 'disable', 'trash', 'edit', 'sms', 'realtime-ai'] as const

async function signInMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('unified command strip follows reference order and hard-locks observation mode', async ({ page }, testInfo) => {
  await signInMiddleAdmin(page)

  await expect(page.locator('[data-reference-page]')).toHaveCount(16)
  await page.locator('[data-reference-page="chat"]').click()
  const createContactButton = page.getByRole('button', { name: /создать контакт|kontakt yaratish/i }).first()
  await expect(createContactButton).toBeVisible()
  await createContactButton.click()
  await expect(page.getByLabel(/имя|ism/i)).toBeVisible()
  await expect(page.getByLabel(/телефон|telefon/i)).toBeVisible()
  await expect(page.getByLabel(/#[0-9a-f]{6}/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Все|Barchasi/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Включены|Yoqilgan/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Отключены|O'chirilgan/i })).toBeVisible()
  await expect(page.getByLabel(/Состояние контактов|Kontakt holati/i).getByRole('button', { name: /Корзина|Savat/i })).toBeVisible()

  const commandButtons = page.locator('[data-reference-command]')
  await expect(commandButtons).toHaveCount(COMMAND_ORDER.length)
  await expect.poll(async () => commandButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-reference-command')))).toEqual([...COMMAND_ORDER])

  for (const command of COMMAND_ORDER) {
    const button = page.locator(`[data-reference-command="${command}"]`)
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box?.width).toBe(56)
    expect(box?.height).toBe(56)
  }

  await page.locator('[data-reference-command="key"]').click()
  await page.locator('[data-reference-command="realtime-ai"]').click()
  await expect(page.locator('[data-reference-command="realtime-ai"]')).toHaveAttribute('aria-pressed', 'true')
  for (const command of COMMAND_ORDER.slice(1)) {
    await expect(page.locator(`[data-reference-command="${command}"]`)).toBeDisabled()
  }
  await expect(page.locator('[data-reference-command="key"]')).toBeEnabled()

  await testInfo.attach('unified-command-strip.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})


test('calculator exposes honest audio recording and transcript fallback', async ({ page }) => {
  await signInMiddleAdmin(page)
  await page.locator('[data-reference-page="calculator"]').click()
  await expect(page.getByLabel('AI purchase request')).toBeVisible()
  const recordButton = page.getByRole('button', { name: /начать запись|yozishni boshlash/i })
  await expect(recordButton).toBeVisible()
  await expect(page.getByRole('button', { name: /^AI$/i })).toBeDisabled()
  await expect(page.getByPlaceholder(/расшифровку аудио|audio transkript/i)).toBeVisible()
})
