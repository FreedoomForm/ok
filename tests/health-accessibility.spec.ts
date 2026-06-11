import { expect, test } from '@playwright/test'

// ═══════════════════════════════════════════════════════════════════════════
// Health & system endpoints
// ═══════════════════════════════════════════════════════════════════════════

test.describe('System health endpoints', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
  })

  test('GET /api/health returns JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    const body = await res.json()
    expect(body).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Cron endpoints — auth checks
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Cron endpoint auth', () => {
  test('GET /api/cron/scheduler requires CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/cron/scheduler')
    // Should reject without cron auth
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/cron/check-trials requires CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/cron/check-trials')
    expect([401, 403, 404]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Public routes — accessibility
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Public page accessibility', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')
    // Should load without error
    await expect(page.locator('body')).toBeVisible()
  })

  test('offline page loads', async ({ page }) => {
    await page.goto('/offline')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Method not allowed — API endpoints should reject wrong HTTP methods
// ═══════════════════════════════════════════════════════════════════════════

test.describe('HTTP method validation', () => {
  test('POST /api/health returns 405 or 404', async ({ request }) => {
    const res = await request.post('/api/health', { data: {} })
    expect([404, 405]).toContain(res.status())
  })

  test('PUT /api/auth/login returns 405 or 404', async ({ request }) => {
    const res = await request.put('/api/auth/login', { data: {} })
    expect([404, 405]).toContain(res.status())
  })
})
