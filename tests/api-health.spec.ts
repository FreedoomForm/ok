/**
 * E2E Smoke Test — API Health
 *
 * Tests that the health endpoint returns 200 with the expected response shape.
 * These tests are skippable if no test server is running.
 */

import { expect, test } from '@playwright/test'

test.describe('API health', () => {
  test('GET /api/health returns 200 with success response', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    // Health endpoint returns { data: { message: "Good!" }, meta: { requestId: "..." } }
    expect(body).toHaveProperty('data')
    expect(body.data).toHaveProperty('message')
  })

  test('GET /api/v1/health returns 200 (versioned API works)', async ({ request }) => {
    const response = await request.get('/api/v1/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('data')
  })
})
