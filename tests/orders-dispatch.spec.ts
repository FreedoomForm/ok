import { expect, test } from '@playwright/test'
import jwt from 'jsonwebtoken'

function makeToken(role: string) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret'
  return jwt.sign({ id: 'test-admin', email: 'test@example.com', role }, secret, { algorithm: 'HS256' })
}

test('/api/admin/warehouse rejects unauthenticated', async ({ page }) => {
  const res = await page.request.get('/api/admin/warehouse')
  expect([401, 403]).toContain(res.status())
})

test('/api/admin/orders/reorder rejects unauthenticated', async ({ page }) => {
  const res = await page.request.patch('/api/admin/orders/reorder', { data: { updates: [] } })
  expect([401, 403]).toContain(res.status())
})

test('/api/admin/orders/reorder validates payload with JWT auth', async ({ page }) => {
  const token = makeToken('SUPER_ADMIN')
  const res = await page.request.patch('/api/admin/orders/reorder', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {},
  })
  expect(res.status()).toBe(400)
})

test('/api/admin/warehouse validates payload with JWT auth', async ({ page }) => {
  const token = makeToken('SUPER_ADMIN')
  const res = await page.request.patch('/api/admin/warehouse', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { googleMapsLink: 'not-a-maps-link' },
  })
  expect(res.status()).toBe(400)
})

test('/api/customers/orders/[id] ignores spoofed customer header without token', async ({ page }) => {
  const res = await page.request.get('/api/customers/orders/test-order-id', {
    headers: {
      'x-customer-id': 'spoofed-customer-id',
    },
  })
  expect(res.status()).toBe(401)
})
