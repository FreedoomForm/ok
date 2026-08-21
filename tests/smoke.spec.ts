import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import jwt from 'jsonwebtoken'

test('login page meets critical accessibility baseline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adminSettings', JSON.stringify({ theme: 'light' }))
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  })
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('customer public site meets critical accessibility baseline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adminSettings', JSON.stringify({ theme: 'light' }))
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  })
  await page.goto('/sites/example-healthy-food')
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

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

test('test admin can authenticate and reach the role dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()

  await expect(page).toHaveURL(/\/super-admin/)
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
})

test('unauthenticated dashboard redirects to login', async ({ page }) => {
  await page.goto('/super-admin')
  await expect(page).toHaveURL(/\/login/)
})

for (const roleFixture of [
  { role: 'middle admin', email: 'middle@example.com', route: '/middle-admin' },
  { role: 'low admin', email: 'low@example.com', route: '/low-admin' },
  { role: 'courier', email: 'courier@example.com', route: '/courier' },
]) {
  test(`${roleFixture.role} can authenticate and hydrate its dashboard`, async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(roleFixture.email)
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()

    await expect(page).toHaveURL(new RegExp(`${roleFixture.route}(?:/|$)`))
    await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
  })
}

test('order lifecycle API validates payload before database access', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.patch('/api/orders/nonexistent-order', {
    data: { action: 'update_details', balance: 100000 },
  })
  expect(response.status()).toBe(400)
})

test('courier is denied admin feature mutations', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const response = await page.request.post('/api/admin/features', {
    data: { name: 'courier-must-not-create', description: 'x', type: 'TEXT' },
  })
  expect(response.status()).toBe(403)
})

test('customer site supports phone login and portal hydration', async ({ page }) => {
  await page.goto('/sites/example-healthy-food/login')
  await expect(page.getByLabel('Phone Number')).toBeVisible()
  await page.getByLabel('Phone Number').fill(process.env.E2E_CUSTOMER_PHONE || '+998901112233')
  await page.locator('form').getByRole('button', { name: /^login$/i }).click()

  await expect(page).toHaveURL(/\/sites\/example-healthy-food\/client/)
  await expect(page.getByRole('heading', { name: /welcome, browser test customer/i })).toBeVisible()
  await expect(page.getByText('Today Menu')).toBeVisible()
  await expect(page.getByText('Client Balance')).toBeVisible()

  await page.locator('#mapsLink').fill('https://example.com/not-a-map')
  await page.getByRole('button', { name: /save location/i }).click()
  await expect(page.getByText('Invalid Google Maps link or coordinates')).toBeVisible()

  await page.locator('#mapsLink').fill('https://maps.google.com/?q=41.311081,69.240562')
  await page.getByRole('button', { name: /save location/i }).click()
  await expect(page.getByText('Location saved')).toBeVisible()
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
