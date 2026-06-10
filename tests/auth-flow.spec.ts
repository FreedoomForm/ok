/**
 * E2E Smoke Test — Auth Flow
 *
 * Tests authentication-related redirects and login page elements.
 * These tests are skippable if no test server is running.
 */

import { expect, test } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'

test.describe('Auth flow', () => {
  test.skip(({ browserName }) => {
    // Skip in CI if no server is reachable (handled by Playwright's webServer config)
    return false
  })

  test('unauthenticated user visiting /super-admin redirects to /login', async ({ page }) => {
    await page.goto('/super-admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('unauthenticated user visiting /courier redirects to /login', async ({ page }) => {
    await page.goto('/courier')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('unauthenticated user visiting /low-admin redirects to /login', async ({ page }) => {
    await page.goto('/low-admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('login page loads and has email/password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="password"], input#password')).toBeVisible({ timeout: 10000 })
  })

  test('login page has submit button', async ({ page }) => {
    await page.goto('/login')
    const submitButton = page.getByRole('button', { name: /sign.?in|log.?in|войти/i })
    // At minimum, there should be a form with some submit mechanism
    await expect(submitButton.or(page.locator('button[type="submit"]'))).toBeVisible({ timeout: 10000 })
  })
})
