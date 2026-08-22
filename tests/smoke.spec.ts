import { test, expect, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import jwt from 'jsonwebtoken'

async function resetBrowserCaches(page: Page) {
  await page.evaluate(async () => {
    localStorage.removeItem('adminSettings')
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((key) => caches.delete(key)))
  })
  await page.reload()
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  })
  await expect.poll(
    () => page.locator('section').first().evaluate((element) => getComputedStyle(element).opacity),
    { timeout: 5000 },
  ).toBe('1')
}

test('login page meets critical accessibility baseline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adminSettings', JSON.stringify({ theme: 'light' }))
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  })
  await page.goto('/login')
  await resetBrowserCaches(page)
  await expect(page.locator('html')).toHaveClass(/\blight\b/)
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
  await resetBrowserCaches(page)
  await expect(page.locator('html')).toHaveClass(/\blight\b/)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('public routes meet bounded navigation timing baseline', async ({ page }, testInfo) => {
  const timings: Array<{ route: string; responseStart: number; domContentLoaded: number; load: number }> = []

  for (const route of ['/login', '/sites/example-healthy-food']) {
    const response = await page.goto(route)
    expect(response?.ok()).toBeTruthy()
    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      return {
        responseStart: navigation?.responseStart ?? 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
        load: navigation?.loadEventEnd ?? 0,
      }
    })
    timings.push({ route, ...timing })
    expect(timing.responseStart).toBeLessThan(5000)
    expect(timing.domContentLoaded).toBeLessThan(10000)
    expect(timing.load).toBeLessThan(15000)
  }

  await testInfo.attach('navigation-timing.json', {
    body: JSON.stringify(timings, null, 2),
    contentType: 'application/json',
  })
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
  await page.getByRole('tab', { name: /chat/i }).click()
  await expect(page.getByText(/direct team chat/i)).toBeVisible()
  await page.getByRole('button', { name: /new conversation/i }).click()
  await expect(page.getByText('Tambo AI')).toBeVisible()
})

test('extracted statistics tab hydrates for super admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const statisticsTab = page.getByRole('tab', { name: /statistics|статист/i })
  await expect(statisticsTab).toBeVisible()
  await statisticsTab.click()
  const activeStatisticsPanel = page.locator('[role="tabpanel"][data-state="active"]')
  await expect(activeStatisticsPanel).toBeVisible()
  await expect(activeStatisticsPanel.getByText(/payment profile|payment|оплат|prepaid/i).first()).toBeVisible()
  await expect(activeStatisticsPanel.getByText(/customer cadence|daily|ежеднев|kunlik/i).first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('order modal hydrates with typed available sets for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.getByRole('button', { name: /create order|создать заказ/i }).click()
  await expect(page.locator('#customerName')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('extracted bin clients table hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const binTab = page.getByRole('tab', { name: /bin|корзин/i })
  await expect(binTab).toBeVisible()
  await binTab.click()
  await expect(page.getByTestId('deleted-orders-panel')).toBeVisible()
  const deletedClientsTab = page.getByRole('tab', { name: /deleted clients|удаленные клиенты/i })
  await expect(deletedClientsTab).toBeVisible()
  await deletedClientsTab.click()
  await expect(page.getByTestId('deleted-clients-table')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('extracted orders tab hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.getByTestId('orders-tab-content')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('sets editor hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.getByRole('tab', { name: /warehouse|склад|ombor|управление/i }).click()
  const setsTab = page.getByRole('tab', { name: /sets|сеты|набор|setlar/i })
  await expect(setsTab).toBeVisible()
  await setsTab.click()
  await expect(setsTab).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('tabpanel', { name: /sets|сеты|набор|setlar/i })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('warehouse cooking manager hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const warehouseTab = page.getByRole('tab', { name: /warehouse|склад|ombor|управление/i })
  await expect(warehouseTab).toBeVisible()
  await warehouseTab.click()
  await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('extracted client directory tab hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const clientsTab = page.getByRole('tab', { name: /clients|клиент/i })
  await expect(clientsTab).toBeVisible()
  await clientsTab.click()
  await expect(page.locator('thead th').nth(2)).toBeVisible()
  await expect(page.locator('thead th').nth(13)).toBeVisible()
  await expect(page.locator('tbody')).toBeVisible()
})

test('extracted client editor dialog hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.getByRole('tab', { name: /clients|клиент/i }).click()
  await page.getByTestId('client-create-button').click()

  await expect(page.locator('#clientName')).toBeVisible()
  await expect(page.locator('#googleMapsLink')).toBeVisible()
  await expect(page.locator('#monday')).toBeVisible()
  await expect(page.getByRole('button', { name: /cancel|отмена/i })).toBeVisible()
  await page.getByRole('button', { name: /cancel|отмена/i }).click()
  await expect(page.locator('#clientName')).toBeHidden()
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

test('order creation API rejects malformed payloads before database access', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const invalidPayment = await page.request.post('/api/orders', {
    data: {
      customerName: 'Contract Test Customer',
      customerPhone: '+998901112233',
      deliveryAddress: 'Tashkent',
      calories: 1600,
      paymentMethod: 'BITCOIN',
    },
  })
  expect(invalidPayment.status()).toBe(400)

  const nestedCalories = await page.request.post('/api/orders', {
    data: {
      customerName: 'Contract Test Customer',
      customerPhone: '+998901112233',
      deliveryAddress: 'Tashkent',
      calories: { value: 1600 },
    },
  })
  expect(nestedCalories.status()).toBe(400)
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

test('auto-order API enforces role authorization and date validation', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const courierResponse = await page.request.post('/api/admin/auto-orders/create', {
    data: { targetDate: '2026-08-21' },
  })
  expect(courierResponse.status()).toBe(403)

  const browser = page.context().browser()
  if (!browser) throw new Error('Browser instance is unavailable for isolated role testing')
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  try {
    await adminPage.goto('/login')
    await adminPage.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
    await adminPage.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await adminPage.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(adminPage).toHaveURL(/\/super-admin(?:\/|$)/)

    const invalidDateResponse = await adminPage.request.post('/api/admin/auto-orders/create', {
      data: { targetDate: 'not-a-date' },
    })
    expect(invalidDateResponse.status()).toBe(400)
  } finally {
    await adminContext.close()
  }
})

test('finance APIs enforce the documented role matrix in the browser', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const courierResponses = await Promise.all([
    page.request.get('/api/admin/finance/admin-balances'),
    page.request.post('/api/admin/finance/buy-ingredients', { data: {} }),
    page.request.get('/api/admin/finance/clients'),
    page.request.get('/api/admin/finance/company'),
    page.request.post('/api/admin/finance/salary', { data: {} }),
    page.request.post('/api/admin/finance/transaction', { data: {} }),
  ])
  for (const response of courierResponses) expect(response.status()).toBe(401)

  const browser = page.context().browser()
  if (!browser) throw new Error('Browser instance is unavailable for isolated role testing')
  const lowAdminContext = await browser.newContext()
  const lowAdminPage = await lowAdminContext.newPage()
  try {
    await lowAdminPage.goto('/login')
    await lowAdminPage.getByLabel(/email/i).fill('low@example.com')
    await lowAdminPage.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await lowAdminPage.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(lowAdminPage).toHaveURL(/\/low-admin(?:\/|$)/)

    const lowAdminClients = await lowAdminPage.request.get('/api/admin/finance/clients')
    expect(lowAdminClients.status()).not.toBe(401)
    const lowAdminTransactionValidation = await lowAdminPage.request.post('/api/admin/finance/transaction', { data: {} })
    expect(lowAdminTransactionValidation.status()).toBe(400)
  } finally {
    await lowAdminContext.close()
  }
})

test('menu sets API enforces role scope and strict create validation', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const courierRead = await page.request.get('/api/admin/sets')
  expect(courierRead.status()).toBe(403)
  const courierWrite = await page.request.post('/api/admin/sets', { data: { name: 'courier-must-not-create' } })
  expect(courierWrite.status()).toBe(403)

  const browser = page.context().browser()
  if (!browser) throw new Error('Browser instance is unavailable for isolated role testing')
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  let createdSetId: string | undefined
  try {
    await adminPage.goto('/login')
    await adminPage.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
    await adminPage.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await adminPage.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(adminPage).toHaveURL(/\/super-admin(?:\/|$)/)
    const invalidCreate = await adminPage.request.post('/api/admin/sets', { data: { name: '   ' } })
    expect(invalidCreate.status()).toBe(400)

    const createResponse = await adminPage.request.post('/api/admin/sets', {
      data: { name: 'browser-contract-set', description: 'temporary test set' },
    })
    expect(createResponse.status()).toBe(201)
    const createdSet = await createResponse.json()
    createdSetId = typeof createdSet?.id === 'string' ? createdSet.id : undefined
    expect(createdSetId).toBeTruthy()

    const invalidUpdate = await adminPage.request.patch(`/api/admin/sets/${createdSetId}`, {
      data: { isActive: 'true' },
    })
    expect(invalidUpdate.status()).toBe(400)
  } finally {
    if (createdSetId) await adminPage.request.delete(`/api/admin/sets/${createdSetId}`)
    await adminContext.close()
  }
})

test('warehouse cooking API enforces role and payload boundaries', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const courierResponse = await page.request.post('/api/admin/warehouse/cook', {
    data: { date: '2026-08-21', updates: [{ dishId: 'dish-1', calorie: 1600, amount: 1 }] },
  })
  expect(courierResponse.status()).toBe(401)

  const browser = page.context().browser()
  if (!browser) throw new Error('Browser instance is unavailable for isolated role testing')
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  try {
    await adminPage.goto('/login')
    await adminPage.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
    await adminPage.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await adminPage.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(adminPage).toHaveURL(/\/super-admin(?:\/|$)/)
    const invalidRequest = await adminPage.request.post('/api/admin/warehouse/cook', {
      data: { date: '2026-08-21', updates: [] },
    })
    expect(invalidRequest.status()).toBe(400)
  } finally {
    await adminContext.close()
  }
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

test('database row API enforces auth and strict payloads', async ({ page }) => {
  const unauthenticated = await page.request.post('/api/admin/database-row', {
    data: { tableId: 'customers', data: { name: 'unauthenticated' } },
  })
  expect(unauthenticated.status()).toBe(403)

  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const nested = await page.request.post('/api/admin/database-row', {
    data: { tableId: 'customers', data: { name: { unsafe: true } } },
  })
  expect(nested.status()).toBe(400)

  const unknownTable = await page.request.post('/api/admin/database-row', {
    data: { tableId: 'unknown', data: { name: 'x' } },
  })
  expect(unknownTable.status()).toBe(400)
})

test('admin client API rejects unsafe create payloads', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/clients', {
    data: {
      name: 'Browser Invalid Client',
      phone: '+123',
      address: 'Tashkent',
      role: 'SUPER_ADMIN',
    },
  })
  expect(response.status()).toBe(400)
})

test('admin clients GET preserves safe typed projection', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/clients?limit=1&offset=0')
  expect(response.status()).toBe(200)
  expect(response.headers()['x-clients-limit']).toBe('1')
  const clients = await response.json() as Array<Record<string, unknown>>
  expect(Array.isArray(clients)).toBe(true)
  if (clients[0]) {
    expect('password' in clients[0]).toBe(false)
    expect('deletedBy' in clients[0]).toBe(false)
  }
})

test('database import API rejects empty workbook uploads', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/database-import-xlsx', {
    multipart: {
      tableId: 'customers',
      file: {
        name: 'empty.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.alloc(0),
      },
    },
  })
  expect(response.status()).toBe(400)
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

test('live map API preserves scoped point arrays for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/live-map?date=not-a-date')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(Array.isArray(body.couriers)).toBe(true)
  expect(Array.isArray(body.clients)).toBe(true)
  expect(Array.isArray(body.orders)).toBe(true)
  expect(body).toHaveProperty('warehouse')
})

test('courier list API preserves scoped pagination contract for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/couriers?limit=10&offset=0')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['x-couriers-limit']).toBe('10')
  expect(response.headers()['x-couriers-offset']).toBe('0')
  expect(Array.isArray(await response.json())).toBe(true)
})

test('deleted client bin API preserves middle-admin scoped array contract', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/clients/bin')
  expect(response.ok()).toBeTruthy()
  expect(Array.isArray(await response.json())).toBe(true)
})

test('action log API preserves scoped pagination response for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/action-logs?limit=10&offset=0&from=2026-01-01&to=2026-12-31')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(Array.isArray(body.logs)).toBe(true)
  expect(typeof body.total).toBe('number')
  expect(typeof body.hasMore).toBe('boolean')
})

test('system auto-scheduler denies courier role access', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  const response = await page.request.get('/api/system/auto-scheduler')
  expect(response.status()).toBe(403)
})

test('low-admin management API preserves middle-admin scoped list contract', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.get('/api/admin/low-admins')
  expect(response.ok()).toBeTruthy()
  expect(Array.isArray(await response.json())).toBe(true)
})

test('all-sheets database import API rejects empty workbook uploads', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/database-import-xlsx-all', {
    multipart: {
      file: {
        name: 'empty.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.alloc(0),
      },
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.ok).toBe(true)
  expect(body.sheetsProcessed).toBe(0)
  expect(body.created).toBe(0)
  expect(body.updated).toBe(0)
})

test('database snapshot rejects malformed date ranges', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  for (const query of [
    '?start=not-a-date&end=2026-09-01T00:00:00.000Z',
    '?start=2026-08-01T00:00:00.000Z',
    '?start=2026-09-01T00:00:00.000Z&end=2026-08-01T00:00:00.000Z',
  ]) {
    const response = await page.request.get(`/api/admin/database-snapshot${query}`)
    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid snapshot date range' })
  }
})
