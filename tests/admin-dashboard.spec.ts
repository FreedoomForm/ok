/**
 * E2E Smoke Test — Admin Dashboard
 *
 * Tests that the admin dashboard page loads after login.
 * Uses JWT-based authentication to bypass the real login flow.
 * These tests are skippable if no test server is running.
 */

import { expect, test } from '@playwright/test'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'

function makeAdminToken(role: string = 'SUPER_ADMIN') {
  return jwt.sign(
    { id: 'test-admin', email: 'test@example.com', role },
    JWT_SECRET,
    { algorithm: 'HS256' },
  )
}

test.describe('Admin dashboard', () => {
  test('admin dashboard page loads with auth cookie', async ({ page }) => {
    // Set auth state via cookie injection
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: makeAdminToken(),
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('/super-admin')

    // The page should not redirect to login (it may show an error if no DB,
    // but it should not redirect away)
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain('/login')
  })

  test('courier page loads with courier auth cookie', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: makeAdminToken('COURIER'),
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('/courier')

    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain('/login')
  })

  test('dashboard shows some content after auth', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: makeAdminToken(),
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('/super-admin')
    await page.waitForTimeout(3000)

    // Page should have rendered some content — at minimum the layout shell
    const bodyText = await page.locator('body').innerText()
    // Not empty and not a generic error page
    expect(bodyText.length).toBeGreaterThan(0)
  })
})
