import { expect, test } from '@playwright/test'
import jwt from 'jsonwebtoken'

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
})

test('theme from adminSettings applies html class', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adminSettings', JSON.stringify({ theme: 'dark' }))
  })

  await page.goto('/login')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('unauthenticated dashboard redirects to login', async ({ page }) => {
  await page.goto('/super-admin')
  await expect(page).toHaveURL(/\/login/)
})

test('features API rejects unauthenticated requests', async ({ page }) => {
  const res = await page.request.post('/api/admin/features', {
    data: { name: 'x', description: 'y', type: 'TEXT' },
  })
  expect([401, 403]).toContain(res.status())
})

test('features API validates payload with JWT auth', async ({ page }) => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret'
  const token = jwt.sign(
    { id: 'test-admin', email: 'test@example.com', role: 'SUPER_ADMIN' },
    secret,
    { algorithm: 'HS256' }
  )

  const res = await page.request.post('/api/admin/features', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {},
  })

  expect(res.status()).toBe(400)
})

test('ai chat API rejects unauthenticated requests', async ({ page }) => {
  const res = await page.request.post('/api/ai/chat', {
    data: { message: 'hello' },
  })
  expect([401, 403]).toContain(res.status())
})
