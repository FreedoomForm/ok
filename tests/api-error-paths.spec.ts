/**
 * E2E tests for API error paths — verifying that errors are returned as strings,
 * not objects, and that the frontend doesn't crash with React error #31.
 *
 * These tests specifically target the bug class where createApiRoute returns
 * { error: { code, message } } and frontend code renders it as-is.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// ── API response format tests ────────────────────────────────────────────────

test.describe('API error response format', () => {
  test('404 routes return string error, not object', async ({ request }) => {
    const routes = [
      '/api/admin/clients/nonexistent-id',
      '/api/admin/orders/nonexistent-id',
      '/api/admin/low-admins/nonexistent-id',
    ]

    for (const route of routes) {
      const res = await request.get(`${BASE}${route}`, {
        headers: { Cookie: 'authjs.session-token=invalid' },
      })
      // May be 401 (unauthorized) or 404 — both are fine for this test
      expect([400, 401, 403, 404, 500]).toContain(res.status())

      const body = await res.json()
      // The error field must be a string, not { code, message }
      if (body.error !== undefined) {
        expect(
          typeof body.error,
          `Route ${route} returned error as object: ${JSON.stringify(body.error)}`
        ).toBe('string')
      }
    }
  })

  test('POST with invalid data returns string error', async ({ request }) => {
    const routes = [
      { url: '/api/admin/clients', body: {} },
      { url: '/api/admin/orders', body: {} },
      { url: '/api/admin/couriers', body: {} },
    ]

    for (const { url, body } of routes) {
      const res = await request.post(`${BASE}${url}`, {
        data: body,
        headers: { 'Content-Type': 'application/json' },
      })
      // Expect 400-500 range
      expect(res.status()).toBeGreaterThanOrEqual(400)

      const resBody = await res.json()
      if (resBody.error !== undefined) {
        expect(
          typeof resBody.error,
          `Route ${url} returned error as object: ${JSON.stringify(resBody.error)}`
        ).toBe('string')
      }
    }
  })

  test('unauthenticated admin routes return proper error format', async ({ request }) => {
    const protectedRoutes = [
      '/api/admin/me',
      '/api/admin/clients',
      '/api/admin/orders',
      '/api/admin/couriers',
      '/api/admin/warehouse',
    ]

    for (const route of protectedRoutes) {
      const res = await request.get(`${BASE}${route}`)
      expect([401, 403]).toContain(res.status())

      const body = await res.json()
      if (body.error !== undefined) {
        expect(
          typeof body.error,
          `Protected route ${route} returned error as object`
        ).toBe('string')
      }
    }
  })
})

// ── Health endpoint tests ────────────────────────────────────────────────────

test.describe('Health and public endpoints', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect(res.ok).toBe(true)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('cron endpoints reject unauthenticated requests', async ({ request }) => {
    const cronRoutes = [
      '/api/cron/aggregate-stats',
      '/api/cron/check-trials',
      '/api/cron/process-jobs',
      '/api/cron/scheduler',
    ]

    for (const route of cronRoutes) {
      const res = await request.get(`${BASE}${route}`)
      expect([401, 403, 405]).toContain(res.status())
    }
  })
})

// ── CORS and security headers ────────────────────────────────────────────────

test.describe('Security headers on error responses', () => {
  test('error responses include proper content-type', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/me`)
    const contentType = res.headers()['content-type'] || ''
    expect(contentType).toContain('application/json')
  })
})
