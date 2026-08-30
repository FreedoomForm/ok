import { test, expect, type Page } from '@playwright/test'

// Addendum §16 performance row: "no repeated fetch loop" and "bounded list
// queries and calendar ranges". The admin dashboard loads every first-class
// resource through bounded GET endpoints; this regression pins that each
// resource endpoint is fetched a bounded number of times on load, that the
// workspace is idle once loading settles (no fetch loop), and that the
// statistics list query carries an explicit calendar range contract.

const BOUNDED_RESOURCE_PATHS = [
  '/api/admin/clients',
  '/api/admin/couriers',
  '/api/admin/low-admins',
  '/api/admin/sets',
  '/api/admin/statistics',
] as const

async function signInMiddleAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
}

test('admin dashboard performs bounded resource fetches with no repeated fetch loop', async ({ page }, testInfo) => {
  const counts = new Map<string, number>()
  const calendarRanges: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') return
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return
    counts.set(url.pathname, (counts.get(url.pathname) ?? 0) + 1)
    if (url.pathname === '/api/admin/statistics') {
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      if (from && to) calendarRanges.push(`${from}..${to}`)
    }
  })

  await signInMiddleAdmin(page)

  // Let the initial load settle deterministically: wait for the bounded
  // resource lists to actually arrive (under shard load networkidle can fire
  // before the dashboard's mount fetches begin), then take the idle snapshot.
  await page.waitForResponse((response) => response.url().includes('/api/admin/statistics') && response.ok(), { timeout: 20000 })
  await page.waitForResponse((response) => response.url().includes('/api/admin/clients') && response.ok(), { timeout: 20000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  const settled = new Map(counts)

  // Every bounded resource list must actually have loaded...
  for (const path of BOUNDED_RESOURCE_PATHS) {
    expect(settled.get(path) ?? 0, `${path} must load at least once`).toBeGreaterThanOrEqual(1)
  }

  // ...a bounded number of times (initial pass plus at most one refresh wave).
  for (const [path, count] of settled) {
    expect(count, `${path} fetch count must stay bounded`).toBeLessThanOrEqual(4)
  }

  // No fetch loop: the workspace is idle — no new API request appears while
  // the administrator simply looks at the dashboard.
  await page.waitForTimeout(2500)
  for (const [path, count] of counts) {
    expect(count, `${path} must not loop while idle`).toBe(settled.get(path) ?? 0)
  }

  // The statistics aggregation uses the explicit bounded date/range contract.
  expect(calendarRanges.length).toBeGreaterThanOrEqual(1)
  for (const range of calendarRanges) {
    const [from, to] = range.split('..')
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  }

  await testInfo.attach('dashboard-fetch-bounds.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})
