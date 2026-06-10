/**
 * E2E Smoke Test — API Contract
 *
 * Tests that API endpoints return the correct error shapes when accessed
 * without proper authentication. This verifies the response contract
 * at the HTTP level without needing seed data.
 */

import { expect, test } from '@playwright/test'

test.describe('API contract — auth errors', () => {
  test('GET /api/orders without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/orders')
    expect([401, 403]).toContain(response.status())

    if (response.status() === 401) {
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toHaveProperty('code')
      expect(body.error.code).toBe('UNAUTHORIZED')
    }
  })

  test('GET /api/v1/orders without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/v1/orders')
    expect([401, 403]).toContain(response.status())

    if (response.status() === 401) {
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toHaveProperty('code')
      expect(body.error.code).toBe('UNAUTHORIZED')
    }
  })

  test('POST /api/auth/login with invalid credentials returns error', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'nonexistent@example.com', password: 'wrongpassword' },
    })

    // Should not return 200 with valid credentials
    expect(response.status()).not.toBe(200)

    const body = await response.json()
    // Should have error shape
    expect(body).toHaveProperty('error')
  })

  test('POST /api/v1/auth/login with invalid credentials returns error', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: { email: 'nonexistent@example.com', password: 'wrongpassword' },
    })

    expect(response.status()).not.toBe(200)
  })
})

test.describe('API contract — error response shape', () => {
  test('error responses include meta.requestId', async ({ request }) => {
    const response = await request.get('/api/orders')
    if (response.status() === 401) {
      const body = await response.json()
      expect(body).toHaveProperty('meta')
      expect(body.meta).toHaveProperty('requestId')
      expect(typeof body.meta.requestId).toBe('string')
    }
  })

  test('error responses have correct structure', async ({ request }) => {
    const response = await request.get('/api/orders')
    if (response.status() === 401) {
      const body = await response.json()
      expect(body.error).toHaveProperty('code')
      expect(body.error).toHaveProperty('message')
      expect(typeof body.error.code).toBe('string')
      expect(typeof body.error.message).toBe('string')
    }
  })
})
