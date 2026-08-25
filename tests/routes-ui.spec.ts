import { expect, test } from '@playwright/test'

test('routes page keeps the unified shell and opens a weekly route draft', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const routesButton = page.locator('[data-reference-page="routes"]')
  await expect(routesButton).toBeVisible()
  await routesButton.click()
  await expect(page.getByRole('heading', { name: /маршруты|yo.?nalishlar|routes/i })).toBeVisible()

  await page.getByRole('button', { name: /новый маршрут|yangi marshrut|new route/i }).click()
  await expect(page.getByLabel(/название|nomi|name/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /сохранить|saqlash|save/i }).last()).toBeVisible()
})
