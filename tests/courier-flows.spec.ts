import { expect, test } from '@playwright/test'
import jwt from 'jsonwebtoken'

// ── Helper ────────────────────────────────────────────────────────────────

function makeToken(role: string) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret'
  return jwt.sign(
    { id: 'test-courier', email: 'courier@example.com', role },
    secret,
    { algorithm: 'HS256' },
  )
}

function courierHeaders() {
  return {
    Authorization: `Bearer ${makeToken('COURIER')}`,
    'Content-Type': 'application/json',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Courier endpoints — Auth & validation
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Courier API — auth checks', () => {
  test('GET /api/courier/profile rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/courier/profile')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/courier/orders rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/courier/orders')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/courier/next-order rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/courier/next-order')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/courier/stats rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/courier/stats')
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/courier/withdraw rejects unauthenticated', async ({ request }) => {
    const res = await request.post('/api/courier/withdraw', {
      data: { amount: 10000 },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/courier/location rejects unauthenticated', async ({ request }) => {
    const res = await request.post('/api/courier/location', {
      data: { latitude: 41.3, longitude: 69.2 },
    })
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Courier API — validation with JWT', () => {
  test('POST /api/courier/withdraw validates amount', async ({ request }) => {
    const res = await request.post('/api/courier/withdraw', {
      headers: courierHeaders(),
      data: { amount: -100 },
    })
    // Should reject negative/invalid amounts
    expect([400, 404, 500]).toContain(res.status())
  })

  test('POST /api/courier/location validates coordinates', async ({ request }) => {
    const res = await request.post('/api/courier/location', {
      headers: courierHeaders(),
      data: { latitude: 999, longitude: 999 },
    })
    // Should reject out-of-range coordinates
    expect([400, 404, 500]).toContain(res.status())
  })

  test('PATCH /api/courier/orders/:id/complete rejects unauthenticated', async ({ request }) => {
    const res = await request.patch('/api/courier/orders/test-id/complete', {
      data: {},
    })
    expect([401, 403]).toContain(res.status())
  })

  test('PATCH /api/courier/orders/:id/fail rejects unauthenticated', async ({ request }) => {
    const res = await request.patch('/api/courier/orders/test-id/fail', {
      data: {},
    })
    expect([401, 403]).toContain(res.status())
  })
})
