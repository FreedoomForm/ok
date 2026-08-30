import { expect, test } from '@playwright/test'

type FocusStop = {
  tag: string
  page: string | null
  command: string | null
  outlineStyle: string
  outlineWidth: string
}

const readFocusStop = (page: import('@playwright/test').Page): Promise<FocusStop> =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null
    if (!element) return { tag: 'none', page: null, command: null, outlineStyle: '', outlineWidth: '' }
    const style = getComputedStyle(element)
    return {
      tag: element.tagName,
      page: element.getAttribute('data-reference-page'),
      command: element.getAttribute('data-reference-command'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })

const countUnlabeledVisibleButtons = (page: import('@playwright/test').Page): Promise<number> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).filter((button) => {
      if (button.offsetParent === null) return false
      const named = button.getAttribute('aria-label') || button.getAttribute('aria-labelledby') || (button.textContent ?? '').trim()
      return !named
    }).length,
  )

test('admin workspace is keyboard operable with a visible focus ring and named icon-only commands', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.getByTestId('orders-tab-content')).toBeVisible()

  // Keyboard traversal: real Tab presses must reach the resource rail and the
  // command strip, and the keyboard focus must stay visible (§16 accessibility:
  // keyboard navigation, focus ring, no inaccessible icon-only commands).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  let railStops = 0
  let commandStops = 0
  let railRing = ''
  let commandRing = ''
  for (let stop = 0; stop < 80; stop += 1) {
    await page.keyboard.press('Tab')
    const focus = await readFocusStop(page)
    if (focus.page) {
      railStops += 1
      if (!railRing && focus.outlineStyle !== 'none' && Number.parseFloat(focus.outlineWidth) >= 1) railRing = focus.outlineWidth
    }
    if (focus.command) {
      commandStops += 1
      if (!commandRing && focus.outlineStyle !== 'none' && Number.parseFloat(focus.outlineWidth) >= 1) commandRing = focus.outlineWidth
    }
    if (railStops > 0 && commandStops > 0 && railRing && commandRing) break
  }
  expect(railStops).toBeGreaterThan(0)
  expect(commandStops).toBeGreaterThan(0)
  expect(railRing, 'rail entries show a visible keyboard focus ring').not.toBe('')
  expect(commandRing, 'command strip buttons show a visible keyboard focus ring').not.toBe('')

  // Enter activation: walking to a rail entry and pressing Enter opens that page.
  // A fresh load gives the walk a deterministic starting point — Chromium keeps
  // the sequential-focus navigation origin at the previously focused element
  // across bare blur()/body.focus() calls.
  await page.reload()
  await expect(page.getByTestId('orders-tab-content')).toBeVisible()
  let activated = false
  for (let stop = 0; stop < 80; stop += 1) {
    await page.keyboard.press('Tab')
    const isRoutesEntry = await page.evaluate(() => document.activeElement?.getAttribute('data-reference-page') === 'routes')
    if (isRoutesEntry) {
      await page.keyboard.press('Enter')
      activated = true
      break
    }
  }
  expect(activated, 'routes rail entry is keyboard reachable').toBe(true)
  await expect(page.getByRole('heading', { name: /маршруты|yo'nalishlar|маршруты/i }).first()).toBeVisible()

  // Icon-only commands keep accessible names on every sampled workspace page.
  expect(await countUnlabeledVisibleButtons(page)).toBe(0)
  await page.locator('[data-reference-page="calculator"]').click()
  await expect(page.getByLabel('AI purchase request')).toBeVisible()
  expect(await countUnlabeledVisibleButtons(page)).toBe(0)
  await page.locator('[data-reference-page="orders"]').click()
  await expect(page.getByTestId('orders-tab-content')).toBeVisible()
  expect(await countUnlabeledVisibleButtons(page)).toBe(0)
})
