import { expect, test } from '@playwright/test'

const RAIL_PAGES = [
  'orders',
  'clients',
  'admins',
  'finance',
  'contracts',
  'transactions',
  'calculator',
  'cooking',
  'routes',
  'chat',
  'warehouse',
  'ingredients',
  'dishes',
  'groups',
  'sets',
] as const

test('every rendered icon-only command exposes an accessible name on every rail page', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.locator('[data-reference-page="orders"]')).toBeVisible({ timeout: 15000 })

  const violations: string[] = []
  for (const pageKey of RAIL_PAGES) {
    const railButton = page.locator(`[data-reference-page="${pageKey}"]`)
    if (!(await railButton.isVisible().catch(() => false))) continue
    await railButton.click()
    await page.waitForTimeout(350)
    const pageViolations = await page.evaluate((currentPage) => {
      const results: string[] = []
      const buttons = Array.from(document.querySelectorAll('button'))
      for (const button of buttons) {
        if (!(button instanceof HTMLElement)) continue
        const style = window.getComputedStyle(button)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const rect = button.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        const text = (button.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (text.length > 0) continue
        if (button.getAttribute('aria-label')?.trim()) continue
        if (button.getAttribute('aria-labelledby')?.trim()) continue
        if (button.getAttribute('title')?.trim()) continue
        const labelledBy = button.getAttribute('aria-labelledby')
        if (labelledBy && labelledBy.split(/\s+/).some((id) => (document.getElementById(id)?.textContent ?? '').trim().length > 0)) continue
        const hasIcon = Boolean(button.querySelector('svg, img, [data-lucide]'))
        if (!hasIcon) continue
        results.push(`${currentPage}: button "${button.className.slice(0, 60)}" has no accessible name`)
      }
      return results
    }, pageKey)
    violations.push(...pageViolations)
  }

  expect(violations).toEqual([])
})
