import { expect, test } from '@playwright/test'
import jwt from 'jsonwebtoken'

// ── Helper ────────────────────────────────────────────────────────────────

function makeToken(role = 'SUPER_ADMIN') {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret'
  return jwt.sign(
    { id: 'test-admin', email: 'test@example.com', role },
    secret,
    { algorithm: 'HS256' },
  )
}

function authHeaders(role?: string) {
  return {
    Authorization: `Bearer ${makeToken(role)}`,
    'Content-Type': 'application/json',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Clients / Customers
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Client CRUD — validation', () => {
  test('POST /api/admin/clients rejects empty body', async ({ request }) => {
    const res = await request.post('/api/admin/clients', {
      headers: authHeaders(),
      data: {},
    })
    // Should require at minimum name + phone + address
    expect([400, 500]).toContain(res.status())
  })

  test('POST /api/admin/clients requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/clients', {
      data: { name: 'Test Client', phone: '+998901234567', address: 'Test Address' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('PATCH /api/admin/clients/bulk-update requires auth', async ({ request }) => {
    const res = await request.patch('/api/admin/clients/bulk-update', {
      data: { clientIds: [], updates: {} },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('DELETE /api/admin/clients/delete requires auth', async ({ request }) => {
    const res = await request.delete('/api/admin/clients/delete', {
      data: { clientIds: [] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/clients/restore requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/clients/restore', {
      data: { clientIds: [] },
    })
    expect([401, 403]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Orders
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Order CRUD — validation', () => {
  test('GET /api/orders requires auth', async ({ request }) => {
    const res = await request.get('/api/orders')
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/orders/bulk-update requires auth', async ({ request }) => {
    const res = await request.patch('/api/admin/orders/bulk-update', {
      data: { orderIds: [], updates: {} },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('DELETE /api/admin/orders/delete requires auth', async ({ request }) => {
    const res = await request.delete('/api/admin/orders/delete', {
      data: { orderIds: [] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/orders/restore requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/orders/restore', {
      data: { orderIds: [] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/orders/reorder validates payload', async ({ request }) => {
    const res = await request.patch('/api/admin/orders/reorder', {
      headers: authHeaders(),
      data: { updates: 'not-an-array' },
    })
    expect([400, 500]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Warehouse
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Warehouse CRUD — validation', () => {
  test('GET /api/admin/warehouse requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/warehouse')
    expect([401, 403]).toContain(res.status())
  })

  test('PATCH /api/admin/warehouse validates Google Maps link', async ({ request }) => {
    const res = await request.patch('/api/admin/warehouse', {
      headers: authHeaders(),
      data: { googleMapsLink: 'https://not-google-maps.com' },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/admin/warehouse/inventory requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/warehouse/inventory')
    expect([401, 403, 404]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Finance
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Finance CRUD — validation', () => {
  test('GET /api/admin/finance/transaction requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/finance/transaction')
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/finance/transaction requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/finance/transaction', {
      data: { amount: 1000, type: 'INCOME' },
    })
    expect([401, 403]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Features
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Feature CRUD — validation', () => {
  test('POST /api/admin/features validates required fields', async ({ request }) => {
    const res = await request.post('/api/admin/features', {
      headers: authHeaders(),
      data: { name: 'x' }, // missing description + type
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/admin/features rejects invalid type', async ({ request }) => {
    const res = await request.post('/api/admin/features', {
      headers: authHeaders(),
      data: { name: 'x', description: 'y', type: 'INVALID' },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/admin/features requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/features')
    expect([401, 403]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Menus & Sets
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Menu & Sets CRUD — validation', () => {
  test('GET /api/admin/menus requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/menus')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/admin/sets requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/sets')
    expect([401, 403, 404]).toContain(res.status())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — Website
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Website CRUD — validation', () => {
  test('GET /api/admin/website requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/website')
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/website/ai-edit requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/website/ai-edit', {
      data: { prompt: 'Change the hero section' },
    })
    expect([401, 403]).toContain(res.status())
  })
})
