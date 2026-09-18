import { expect, test, type Page } from '@playwright/test'

// §16 performance row: "no duplicate component mounts for same resource".
// Every canonical rail page renders exactly one content root, marked with
// `data-reference-content-root="<page>"`. A duplicated mount would mean the
// same resource surface is attached twice — double fetches, divergent local
// state and competing panels. This named regression walks every canonical
// rail page on desktop and mobile and asserts exactly one attached content
// root per page, no accumulation after revisits, and a bounded request count
// when a page is revisited (no duplicate-mount refetch storm).

const PAGE_IDS = [
  'chat', 'settings', 'ingredients', 'cooking', 'dishes', 'groups', 'sets',
  'finance', 'contracts', 'transactions', 'orders', 'routes', 'admins',
  'couriers', 'clients', 'calculator',
] as const

async function contentRootCount(page: Page, target: string): Promise<number> {
  return page.locator(`[data-reference-content-root="${target}"]`).count()
}

async function loginAsMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
}

for (const target of PAGE_IDS) {
  test(`resource page ${target} mounts exactly one content root`, async ({ page }) => {
    await loginAsMiddleAdmin(page)
    if (target !== 'orders') {
      await page.locator(`[data-reference-page="${target}"]`).click()
      await expect(page.locator(`[data-reference-page="${target}"]`)).toHaveAttribute('aria-current', 'page')
    }
    await expect.poll(() => contentRootCount(page, target), { timeout: 15_000 }).toBe(1)
    await expect(page.locator(`[data-reference-content-root="${target}"]`)).toBeVisible()
  })
}

test('revisiting a resource page re-mounts exactly one content root without a fetch storm', async ({ page }) => {
  await loginAsMiddleAdmin(page)

  const ordersRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/admin/orders')) ordersRequests.push(request.method())
  })

  await page.locator('[data-reference-page="clients"]').click()
  await expect(page.locator('[data-reference-page="clients"]')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => contentRootCount(page, 'clients'), { timeout: 15_000 }).toBe(1)
  await expect.poll(() => contentRootCount(page, 'orders'), { timeout: 5_000 }).toBe(0)

  ordersRequests.length = 0
  await page.locator('[data-reference-page="orders"]').click()
  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => contentRootCount(page, 'orders'), { timeout: 15_000 }).toBe(1)
  await expect.poll(() => contentRootCount(page, 'clients'), { timeout: 5_000 }).toBe(0)

  // A single revisit may refresh the list once (mount effect) — anything
  // beyond a small constant means the surface mounted more than once.
  await page.waitForTimeout(1500)
  expect(ordersRequests.length).toBeLessThanOrEqual(4)
})
