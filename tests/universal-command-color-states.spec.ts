import { test, expect, type Page, type Locator } from '@playwright/test'

// Addendum §3.1/§14: the key has three visually distinct phases — disarmed,
// armed (background turns green) and active-mode — destructive commands show
// the red state, and disabled commands carry the disabled treatment. §14 makes
// the active green/red and disabled states of every universal command button a
// tested DOM/computed-style contract, not a screenshot afterthought.

const EMERALD_600 = 'oklch(0.596 0.145 163.225)'
const RED_600 = 'oklch(0.577 0.245 27.325)'
const CARD_PAPER = 'rgb(255, 252, 243)'

async function signInMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

// Keyboard activation keeps the synthetic pointer away from the buttons so the
// hover tones never mask the state colors under assertion.
async function activate(page: Page, locator: Locator) {
  await locator.focus()
  await page.keyboard.press('Enter')
}

test('universal command buttons expose the reference green, red and disabled states', async ({ page }, testInfo) => {
  await signInMiddleAdmin(page)

  const key = page.locator('[data-reference-command="key"]')
  const trash = page.locator('[data-reference-command="trash"]')
  const enable = page.locator('[data-reference-command="enable"]')

  // Disarmed key: flat card tone, not green/red.
  await expect(key).toHaveCSS('background-color', CARD_PAPER)

  // §3.1: pressing the key turns its background green (armed).
  await activate(page, key)
  await expect(key).toHaveCSS('background-color', EMERALD_600)
  await expect(key).toHaveAttribute('aria-pressed', 'true')

  // Armed special command: Enable enters enabled mode with the green command
  // tone (§3.2 green transition), key turns red (active).
  await activate(page, enable)
  await expect(enable).toHaveCSS('background-color', EMERALD_600)
  await expect(key).toHaveCSS('background-color', RED_600)
  await activate(page, page.getByRole('button', { name: 'Подтвердить', exact: true }))

  // Destructive command: armed Trash shows the red state on both the key and
  // the trash command (§3.1 red/green transition grammar).
  await activate(page, key)
  await activate(page, trash)
  await expect(key).toHaveCSS('background-color', RED_600)
  await expect(trash).toHaveCSS('background-color', RED_600)
  await expect(trash).toHaveAttribute('aria-pressed', 'true')
  // Confirm exits trash mode; the workspace returns to the normal flow.
  await activate(page, page.getByRole('button', { name: 'Подтвердить', exact: true }))
  await expect(trash).toHaveCSS('background-color', CARD_PAPER)

  // Disabled state: without a selection the Edit command is disabled with the
  // disabled opacity treatment (§14 disabled state).
  const edit = page.locator('[data-reference-command="edit"]')
  await expect(edit).toBeDisabled()
  await expect(edit).toHaveCSS('opacity', '0.45')

  await testInfo.attach('universal-command-color-states.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})
