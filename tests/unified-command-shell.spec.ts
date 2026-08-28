import { test, expect, type Page } from '@playwright/test'

const COMMAND_ORDER = ['key', 'search', 'create', 'enable', 'disable', 'trash', 'edit', 'sms', 'realtime-ai'] as const

async function signInMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

async function signInLowAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_LOW_ADMIN_EMAIL || 'low@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/low-admin(?:\/|$)/)
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
  const commandStrip = page.locator('[data-reference-command-strip="true"]')
  await expect(commandStrip).toHaveCSS('border-bottom-width', '0px')
  const inactiveSearch = page.locator('[data-reference-command="search"]')
  await expect(inactiveSearch).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
  await expect(inactiveSearch).toHaveCSS('border-radius', '0px')
  await expect(page.locator('[data-reference-page-rail="true"] button').first()).toHaveCSS('border-radius', '0px')

  await page.locator('[data-reference-command="key"]').click()
  await page.locator('[data-reference-command="realtime-ai"]').click()
  await expect(page.locator('[data-reference-command="realtime-ai"]')).toHaveAttribute('aria-pressed', 'true')
  for (const command of COMMAND_ORDER.slice(1)) {
    await expect(page.locator(`[data-reference-command="${command}"]`)).toBeDisabled()
  }
  await expect(page.locator('[data-reference-command="key"]')).toBeEnabled()
  await page.locator('[data-reference-page="calculator"]').click()
  await expect(page.locator('[data-reference-page="chat"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-reference-page="calculator"]')).not.toHaveAttribute('aria-current', 'page')

  await testInfo.attach('unified-command-strip.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})


test('low-admin shell keeps one visible 16-resource rail and nine-command strip', async ({ page }) => {
  await signInLowAdmin(page)
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(16)
  await expect(page.locator('[data-reference-command]:visible')).toHaveCount(COMMAND_ORDER.length)
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(await page.locator('[data-reference-page]').count())
})

test('calculator secondary rail uses flat borderless reference chrome', async ({ page }) => {
  await signInMiddleAdmin(page)
  await page.locator('[data-reference-page="calculator"]').click()
  const rail = page.locator('aside[aria-label="История покупок"]')
  await expect(rail).toBeVisible()
  await expect(rail).toHaveCSS('border-right-width', '0px')
  await expect(rail).toHaveCSS('box-shadow', 'none')
  await expect(rail.locator('div').filter({ has: page.getByRole('button') }).first()).toHaveCSS('border-radius', '0px')
})

test('settings resource is first-class and persists validated preferences', async ({ page }) => {
  await signInMiddleAdmin(page)
  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.getByRole('switch', { name: /компактный режим|ixcham rejim/i })).toBeVisible()
  await page.getByRole('switch', { name: /компактный режим|ixcham rejim/i }).click()
  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/admin/settings') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: /сохранить настройки|sozlamalarni saqlash/i }).click()
  await expect((await saveResponse).ok()).toBe(true)
})

test('universal commands expose labels and keyboard focus', async ({ page }) => {
  await signInMiddleAdmin(page)
  for (const command of COMMAND_ORDER) {
    const button = page.locator(`[data-reference-command="${command}"]`)
    await expect(button).toHaveAttribute('aria-label', /.+/)
    if (await button.isEnabled()) {
      await button.focus()
      await expect(button).toBeFocused()
    } else {
      await expect(button).toBeDisabled()
    }
  }
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

test('calculator AI suggestions are editable and require explicit confirmation', async ({ page }) => {
  await signInMiddleAdmin(page)
  let savedPayload: { items?: Array<{ amount: number; costPerUnit: number }> } | null = null
  let pricePayload: { items?: Array<{ name: string; costPerUnit: number; enabled: boolean }> } | null = null
  await page.route('**/api/admin/finance/purchases/assist', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requiresConfirmation: true, items: [{ name: 'AI Test Rice', amount: 2, unit: 'kg', costPerUnit: 100, totalCost: 200 }], rejected: [], source: 'text' }) })
  })
  await page.route('**/api/admin/finance/purchases/price-influence', async (route) => {
    pricePayload = route.request().postDataJSON() as { items?: Array<{ name: string; costPerUnit: number; enabled: boolean }> }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: 1, skipped: 0, rejected: [] }) })
  })
  await page.route('**/api/admin/finance/purchases', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    savedPayload = route.request().postDataJSON() as { items?: Array<{ amount: number; costPerUnit: number }> }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ purchase: { id: 'mock-ai-draft', status: 'DRAFT' } }) })
  })
  await page.locator('[data-reference-page="calculator"]').click()
  await page.getByLabel('AI purchase request').fill('rice')
  await page.getByRole('button', { name: /^AI$/i }).click()
  await expect(page.locator('[data-reference-ai-suggestions="true"]')).toBeVisible()
  const amount = page.getByLabel(/AI количество ai-/).first()
  const price = page.getByLabel(/AI цена ai-/).first()
  await expect(amount).toHaveValue('2')
  await expect(page.getByRole('button', { name: /сохранить список/i })).toBeDisabled()
  await amount.fill('3')
  await price.fill('120')
  await page.getByLabel(/разрешить цену AI|AI narxiga ruxsat/i).first().check()
  await page.getByRole('button', { name: /подтвердить AI-предложения/i }).click()
  await expect.poll(() => pricePayload?.items?.[0]).toMatchObject({ costPerUnit: 120, enabled: true })
  await expect(page.getByRole('button', { name: /сохранить список/i })).toBeEnabled()
  await page.getByRole('button', { name: /сохранить список/i }).click()
  await expect.poll(() => savedPayload?.items?.[0]).toMatchObject({ amount: 3, costPerUnit: 120 })
})
