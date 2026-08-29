import { test, expect, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import * as XLSX from 'xlsx'

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

test('customer public landing exposes only RU and UZ user-facing copy', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('language', 'ru'))
  await page.goto('/sites/example-healthy-food')
  await resetBrowserCaches(page)
  await expect(page.getByRole('button', { name: 'ru', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Здоровое Питание - Улучшите Качество Жизни', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Цены', exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Languages|Core modules|Portal access|Personalized meal delivery portal|Portal features|Login|Register|What clients get|A clearer front door to the service|Available pages|Landing|Client Home|History|Phone-first access|Daily operations clarity|Plans|Back to landing/i)
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

test('Database opens as a first-class workspace surface without duplicate navigation', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  const databaseEntry = page.getByRole('button', { name: /база данных|database|ma.?lumotlar bazasi/i })
  await expect(databaseEntry).toBeVisible()
  await databaseEntry.click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/?$)/)
  await expect(page.locator('[data-reference-database-surface]')).toBeVisible()
  await expect(page.locator('[data-reference-database-surface]')).toContainText(/таблиц|jadvallar|tables/i)
})

test('middle-admin shared workspace meets critical accessibility baseline', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('courier shared workspace meets critical accessibility baseline', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('super-admin shared workspace meets critical accessibility baseline', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('client shared workspace meets critical accessibility baseline', async ({ page }) => {
  await page.goto('/sites/example-healthy-food/login')
  const phoneField = page.getByLabel(/Phone Number|Номер телефона|Telefon raqami/i)
  await expect(phoneField).toBeVisible()
  await phoneField.fill(process.env.E2E_CUSTOMER_PHONE || '+998901112233')
  await page.locator('form').getByRole('button', { name: /войти|kirish|login/i }).click()
  await expect(page).toHaveURL(/\/sites\/example-healthy-food\/client(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(seriousViolations).toEqual([])
})

test('public site skips unauthenticated customer profile probe', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('customerToken')
  })

  const profileRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/customers/profile')) {
      profileRequests.push(request.url())
    }
  })

  await page.goto('/sites/example-healthy-food')
  await expect(page.getByRole('link', { name: /login|войти|kirish/i }).first()).toBeVisible()
  await page.waitForTimeout(100)

  expect(profileRequests).toEqual([])
})

test('customer detail hides soft-deleted orders', async ({ page }) => {
  const db = new PrismaClient()
  const orderNumber = 800000000 + (Date.now() % 1000000)
  let customerId: string | undefined
  let orderId: string | undefined

  try {
    const customer = await db.customer.create({
      data: {
        name: 'Browser Detail Fixture',
        phone: `+1555${String(orderNumber).slice(-7)}`,
        address: 'Browser Test Address',
        autoOrdersEnabled: false,
      },
    })
    customerId = customer.id

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        orderStatus: 'PENDING',
        deliveryAddress: customer.address,
        deletedAt: new Date(),
      },
    })
    orderId = order.id

    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { algorithm: 'HS256' },
    )
    const response = await page.request.get(`/api/customers/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status()).toBe(404)
  } finally {
    await Promise.allSettled([
      ...(orderId ? [db.order.delete({ where: { id: orderId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
    ])
    await db.$disconnect()
  }
})

test('soft-deleted customer tokens cannot access profile', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+1666${String(Date.now()).slice(-7)}`
  let customerId: string | undefined

  try {
    const customer = await db.customer.create({
      data: {
        name: 'Browser Deleted Customer Fixture',
        phone,
        address: 'Browser Test Address',
        deletedAt: new Date(),
        autoOrdersEnabled: false,
      },
    })
    customerId = customer.id

    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { algorithm: 'HS256' },
    )
    const response = await page.request.get('/api/customers/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status()).toBe(401)
  } finally {
    if (customerId) {
      await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('customer data responses are private and not cached', async ({ page }) => {
  const response = await page.request.get('/api/customers/orders')

  expect(response.status()).toBe(401)
  expect(response.headers()['cache-control']).toBe('private, no-store, max-age=0, must-revalidate')
  expect(response.headers()['set-cookie'] || '').not.toContain('authjs.')
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
  await page.locator('[data-reference-page="chat"]').click()
  await expect(page.getByText(/direct team chat|командный чат|командный чат и AI-помощники|jamoaviy chat|komanda chati/i)).toBeVisible()
  await page.getByRole('button', { name: /new conversation|новая беседа|выберите людей|yangi suhbat|odamlarni tanlash/i }).click()
  await expect(page.getByText('Tambo AI')).toBeVisible()
})

test('extracted statistics tab hydrates for super admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const statisticsAction = page.locator('[data-reference-super-statistics]')
  await expect(statisticsAction).toBeVisible()
  await statisticsAction.click()
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

  const clientsPage = page.locator('[data-reference-page="clients"]')
  await expect(clientsPage).toBeVisible()
  await clientsPage.click()
  await expect(page.getByTestId('client-create-button')).toBeVisible()
  const binResponse = await page.request.get('/api/admin/clients/bin')
  expect(binResponse.ok()).toBeTruthy()
  await expect(page.locator('tbody')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('non-order admin view skips draft normalization write', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'autofood:dashboard-ui:low',
      JSON.stringify({ activeTab: 'statistics', selectedPeriodISO: null, showFilters: false, searchTerm: '', clientSearchTerm: '' }),
    )
  })

  const normalizeRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/admin/dispatch/normalize-drafts')) {
      normalizeRequests.push(request.method())
    }
  })

  await page.goto('/login')
  await page.getByLabel(/email/i).fill('low@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/low-admin(?:\/|$)/)
  const statisticsTab = page.locator('nav[aria-hidden="true"] button[aria-label="Статистика"]')
  await expect(statisticsTab).toHaveCount(1)
  await statisticsTab.click({ force: true })
  await expect(statisticsTab).toHaveAttribute('data-state', 'active')
  await page.waitForTimeout(100)

  expect(normalizeRequests).toEqual([])
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
  await page.locator('[data-reference-page="sets"]').click()
  const setsTab = page.locator('[role="tablist"] [role="tab"]').filter({ hasText: /sets|сеты|набор|setlar/i }).first()
  await expect(setsTab).toBeVisible()
  await setsTab.click()
  await expect(setsTab).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('tabpanel', { name: /sets|сеты|набор|setlar/i })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('Vercel cron scheduler honors disabled customer dates through the authenticated browser path', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const target = new Date()
    target.setDate(target.getDate() + 1)
    target.setHours(0, 0, 0, 0)
    const targetDate = target.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: { name: `Browser Cron Disabled ${nonce}`, phone: `+1777${String(Date.now()).slice(-7)}`, address: 'Cron browser address', createdBy: owner.id, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }), autoOrdersEnabled: false } })
    customerId = customer.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const disable = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'CLIENT', resourceIds: [customer.id], date: targetDate, state: 'DISABLED', reason: 'browser cron contract' } })
    expect(disable.status()).toBe(200)
    await db.customer.update({ where: { id: customer.id }, data: { autoOrdersEnabled: true } })
    const cron = await page.request.get('/api/cron/scheduler', { headers: { authorization: `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}` } })
    expect(cron.status()).toBe(200)
    const createdForDisabledDate = await db.order.findFirst({ where: { customerId: customer.id, deliveryDate: { gte: target, lt: new Date(target.getTime() + 86400000) } }, select: { id: true } })
    expect(createdForDisabledDate).toBeNull()
  } finally {
    if (customerId) {
      await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
      await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('Vercel cron scheduler honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const target = new Date()
    target.setDate(target.getDate() + 1)
    target.setHours(0, 0, 0, 0)
    const targetDate = target.toISOString().slice(0, 10)
    const start = new Date(target)
    start.setDate(start.getDate() - 1)
    const end = new Date(target)
    end.setDate(end.getDate() + 2)
    const customer = await db.customer.create({ data: { name: `Browser Contract Disabled ${nonce}`, phone: `+1779${String(Date.now()).slice(-7)}`, address: 'Contract disabled browser address', createdBy: owner.id, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }), autoOrdersEnabled: true } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', periods: { create: { startDate: start, endDate: end, status: 'ENABLED', enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], disabledDates: [targetDate] } } }, select: { id: true } })
    contractId = contract.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)
    const cron = await page.request.get('/api/cron/scheduler', { headers: { authorization: `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}` } })
    expect(cron.status()).toBe(200)
    const createdForDisabledDate = await db.order.findFirst({ where: { customerId: customer.id, deliveryDate: { gte: target, lt: new Date(target.getTime() + 86400000) } }, select: { id: true } })
    expect(createdForDisabledDate).toBeNull()
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('legacy system scheduler honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const target = new Date()
    target.setDate(target.getDate() + 2)
    target.setHours(0, 0, 0, 0)
    const targetDate = target.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: { name: `Browser System Contract Disabled ${nonce}`, phone: `+1780${String(Date.now()).slice(-7)}`, address: 'System scheduler browser address', createdBy: owner.id, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }), autoOrdersEnabled: true } })
    customerId = customer.id
    const start = new Date(target)
    start.setDate(start.getDate() - 1)
    const end = new Date(target)
    end.setDate(end.getDate() + 1)
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', periods: { create: { startDate: start, endDate: end, status: 'ENABLED', enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], disabledDates: [targetDate] } } }, select: { id: true } })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const scheduler = await page.request.get(`/api/system/auto-scheduler?date=${targetDate}`)
    expect(scheduler.status()).toBe(200)
    const createdForDisabledDate = await db.order.findFirst({ where: { customerId: customer.id, deliveryDate: { gte: target, lt: new Date(target.getTime() + 86400000) } }, select: { id: true } })
    expect(createdForDisabledDate).toBeNull()
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('warehouse cooking manager hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const warehouseTab = page.locator('[data-reference-page="cooking"]')
  await expect(warehouseTab).toBeVisible()
  await warehouseTab.click()
  await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
})

test('scoped client projection exposes contract-period availability for effective demand', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const customer = await db.customer.create({ data: { name: `Browser Period Client ${nonce}`, phone: `+1778${String(Date.now()).slice(-7)}`, address: 'Period browser address', createdBy: owner.id, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({
      data: {
        customerId: customer.id,
        ownerAdminId: owner.id,
        status: 'ENABLED',
        periods: { create: { startDate: new Date('2099-09-01T00:00:00.000Z'), endDate: new Date('2099-09-07T00:00:00.000Z'), status: 'ENABLED', enabledWeekdays: ['MONDAY'], disabledDates: ['2099-09-04'] } },
      },
      select: { id: true },
    })
    contractId = contract.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.get(`/api/admin/clients?search=${encodeURIComponent(customer.name)}`)
    expect(response.status()).toBe(200)
    const rows = await response.json()
    const projected = rows.find((row: { id?: string }) => row.id === customer.id)
    expect(projected?.contractPeriods).toEqual([{ customerId: customer.id, startDate: '2099-09-01T00:00:00.000Z', endDate: '2099-09-07T00:00:00.000Z', isActive: true, enabledWeekdays: ['MONDAY'], disabledDates: ['2099-09-04'] }])
  } finally {
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking actual-consumption draft persists and reloads through the authorized browser session', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const payload = {
    date: '2099-12-31T00:00:00.000Z',
    menuNumber: 1,
    dishes: { 'browser-consumption-dish': 1 },
    consumption: [{
      dishId: 'browser-consumption-dish',
      calorie: 1600,
      amount: 1,
      ingredients: [{ name: 'Browser Rice', amount: 275, unit: 'g' }],
      provenance: { orderIds: ['browser-consumption-order'], contractIds: ['browser-consumption-contract'] },
    }],
  }
  try {
    const save = await page.request.post('/api/admin/warehouse/cooking-plan', { data: payload })
    expect(save.status()).toBe(200)
    const reload = await page.request.get('/api/admin/warehouse/cooking-plan?date=2099-12-31')
    expect(reload.status()).toBe(200)
    const body = await reload.json()
    expect(body.consumption).toEqual(payload.consumption)
    expect(body.dishes).toEqual(payload.dishes)
  } finally {
    const cleanup = await page.request.delete('/api/admin/warehouse/cooking-plan?date=2099-12-31')
    expect([200, 404]).toContain(cleanup.status())
  }
})

test('super-admin portal exposes the shared flat role shell', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(3)
  await expect(page.locator('[role="tablist"]:visible')).toHaveCount(0)
  await expect(page.locator('header')).toHaveCount(0)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  await expect(page.locator('nav[aria-label="Resource pages"]')).toHaveCount(0)
  await expect(page.locator('nav[aria-label="Разделы ресурсов / Resurslar"]')).toHaveCount(1)
  await expect(page.getByText('Control layer', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Platform governance', { exact: true })).toHaveCount(0)
  if ((page.viewportSize()?.width ?? 0) < 768) return
  const profileButton = page.locator('[data-reference-role-actions] button').filter({ hasText: /Супер-администратор|Super administrator|Super Admin/ }).first()
  await profileButton.click()
  const profileDialog = page.getByRole('dialog').last()
  await expect(profileDialog).toBeVisible()
  await expect(profileDialog.getByRole('heading', { name: /профил|profil/i })).toBeVisible()
  await expect(profileDialog).not.toContainText(/Profile settings|Update your super admin identity|New password \(optional\)/)
})

test('super-admin governance rail tracks the active page and the create command opens the administrators dialog', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  await expect(page.locator('[data-reference-page="admins"]')).toHaveAttribute('aria-current', 'page')
  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('tabpanel', { name: 'Интерфейс' })).toBeVisible()
  await expect(page.locator('[data-reference-page="admins"]')).not.toHaveAttribute('aria-current', 'page')
  await page.locator('[data-reference-page="admins"]').click()
  await expect(page.locator('[data-reference-page="admins"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('tabpanel', { name: 'Администраторы' })).toBeVisible()

  // Off-grammar commands stay honestly disabled; create opens the real dialog.
  await expect(page.locator('[data-reference-command="trash"]')).toBeDisabled()
  await expect(page.locator('[data-reference-command="realtime-ai"]')).toBeDisabled()
  await page.locator('[data-reference-command="create"]').click()
  const createDialog = page.getByRole('dialog')
  await expect(createDialog).toBeVisible()
  await expect(createDialog.getByRole('heading', { name: 'Создать администратора' })).toBeVisible()
  await createDialog.getByRole('button', { name: /закрыть|close/i }).first().click()
  await expect(createDialog).toHaveCount(0)
})

test('courier portal exposes the shared flat role shell', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await expect(page.locator('[data-reference-command]')).toHaveCount(9)
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(3)
  await expect(page.locator('[role="tablist"]')).toHaveCount(0)
  await expect(page.locator('[data-reference-local-actions]')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText(/Refresh|Last sync|Delivery progress|Pending|Delivered|Withdraw/)
})

test('courier rail tracks the active page and renders chat inside the workspace', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)

  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
  await page.locator('[data-reference-page="chat"]').click()
  await expect(page.locator('[data-reference-page="chat"]')).toHaveAttribute('aria-current', 'page')
  // Chat lives in the workspace as a rail page, not behind a modal overlay.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Командный чат и AI-помощники в одном месте.')).toBeVisible()
  await expect(page.locator('[data-reference-page="orders"]')).not.toHaveAttribute('aria-current', 'page')
  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
  await page.locator('[data-reference-page="orders"]').click()
  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
})

test('courier Uzbek shell stays localized after language persistence', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await page.evaluate(() => localStorage.setItem('language', 'uz'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Buyurtmalar', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sozlamalar', exact: true })).toBeVisible()
  await expect(page.getByText('Faol', { exact: true }).first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Refresh|Last sync|Delivery progress|Pending|Delivered|Withdraw/)
  await page.getByRole('button', { name: 'Pul yechish', exact: true }).click()
  await page.getByPlaceholder('Miqdor (UZS)').fill('0')
  await page.getByRole('button', { name: 'Yechish', exact: true }).click()
  await expect(page.getByText(/Yaroqli yechish miqdorini kiriting|Enter a valid withdrawal amount/i)).toBeVisible()
  await expect(page.getByText('Enter a valid withdrawal amount', { exact: true })).toHaveCount(0)
})

test('courier Uzbek profile remains localized after language persistence', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await page.evaluate(() => localStorage.setItem('language', 'uz'))
  await page.reload()
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click()
  await expect(page.getByText('Kuryer profili', { exact: true })).toBeVisible()
  await expect(page.getByText('Shaxsiy maʼlumotlaringiz', { exact: true })).toBeVisible()
  await expect(page.locator('main button').filter({ hasText: 'Tahrirlash' })).toBeVisible()
  await expect(page.locator('[data-slot="card-title"]').filter({ hasText: 'Parolni o‘zgartirish' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Профиль курьера|Смена пароля|Ваши личные данные/)
})

test('courier portal exposes only RU and UZ user-facing language controls', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_COURIER_EMAIL || 'courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await expect(page.getByRole('heading', { name: /Курьер|Kuryer/i })).toBeVisible()
  const languageButton = page.locator('button[title^="Язык:"]')
  await expect(languageButton).toHaveCount(1)
  await page.getByRole('button', { name: /Язык:/i }).click()
  await expect(page.getByRole('menuitem')).toHaveCount(2)
  await expect(page.getByRole('menuitem', { name: /English/i })).toHaveCount(0)
})

test('courier portal hides assigned orders on disabled courier days and restores them', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const courierEmail = `browser-courier-scope-${nonce}@example.com`
  const courierPassword = `CourierScope-${nonce.slice(0, 8)}`
  const orderNumber = 920000000 + Number.parseInt(nonce.replace(/\D/g, '').slice(0, 8), 10)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash(courierPassword, 10), name: `Browser Courier Scope ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    const customer = await db.customer.create({ data: { name: `Browser Courier Scoped Customer ${nonce}`, phone: `+199${nonce.replace(/\D/g, '').slice(0, 9).padEnd(9, '7')}`, address: 'Courier scoped browser address', createdBy: owner.id, isActive: true, autoOrdersEnabled: true } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: courier.id, orderStatus: 'PENDING', paymentStatus: 'PAID', paymentMethod: 'CARD', deliveryAddress: customer.address, deliveryDate: new Date(`${todayKey}T12:00:00.000Z`), deliveryTime: '12:00', quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill(courierPassword)
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/|$)/)
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()

    await db.resourceAvailability.create({ data: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`), state: 'DISABLED', reason: `browser courier disabled ${nonce}` } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Нет активных заказов|Faol buyurtmalar yo‘q/i })).toBeVisible()

    await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`) } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()
  } finally {
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    const courier = await db.admin.findUnique({ where: { email: courierEmail }, select: { id: true } }).catch(() => null)
    if (courier) await db.admin.delete({ where: { id: courier.id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('courier current route hides orders on disabled courier days and restores them', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const courierEmail = `browser-courier-route-scope-${nonce}@example.com`
  const courierPassword = `CourierRouteScope-${nonce.slice(0, 8)}`
  const orderNumber = 921000000 + Number.parseInt(nonce.replace(/\D/g, '').slice(0, 8), 10)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let courierId: string | undefined
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash(courierPassword, 10), name: `Browser Courier Route Scope ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser Courier Route Customer ${nonce}`, phone: `+198${nonce.replace(/\D/g, '').slice(0, 9).padEnd(9, '8')}`, address: 'Courier route browser address', createdBy: owner.id, isActive: true, autoOrdersEnabled: true } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: courier.id, orderStatus: 'PENDING', paymentStatus: 'PAID', paymentMethod: 'CARD', deliveryAddress: customer.address, deliveryDate: new Date(`${todayKey}T12:00:00.000Z`), deliveryTime: '12:00', quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill(courierPassword)
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/|$)/)
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()
    const initialRoute = await page.request.get(`/api/courier/route?date=${todayKey}`)
    expect(initialRoute.ok()).toBeTruthy()
    const initialOrders = await initialRoute.json() as Array<{ id: string }>
    expect(initialOrders.some((routeOrder) => routeOrder.id === orderId)).toBe(true)

    await db.resourceAvailability.create({ data: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`), state: 'DISABLED', reason: `browser courier route disabled ${nonce}` } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toHaveCount(0)
    const disabledRoute = await page.request.get(`/api/courier/route?date=${todayKey}`)
    expect(disabledRoute.ok()).toBeTruthy()
    const disabledOrders = await disabledRoute.json() as Array<{ id: string }>
    expect(disabledOrders.some((routeOrder) => routeOrder.id === orderId)).toBe(false)

    await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`) } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()
    const restoredRoute = await page.request.get(`/api/courier/route?date=${todayKey}`)
    expect(restoredRoute.ok()).toBeTruthy()
    const restoredOrders = await restoredRoute.json() as Array<{ id: string }>
    expect(restoredOrders.some((routeOrder) => routeOrder.id === orderId)).toBe(true)
  } finally {
    if (courierId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courierId } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('courier next order hides disabled courier days and restores them', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const courierEmail = `browser-courier-next-scope-${nonce}@example.com`
  const courierPassword = `CourierNextScope-${nonce.slice(0, 8)}`
  const orderNumber = 922000000 + Number.parseInt(nonce.replace(/\D/g, '').slice(0, 8), 10)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let courierId: string | undefined
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash(courierPassword, 10), name: `Browser Courier Next Scope ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser Courier Next Customer ${nonce}`, phone: `+197${nonce.replace(/\D/g, '').slice(0, 9).padEnd(9, '7')}`, address: 'Courier next browser address', createdBy: owner.id, isActive: true, autoOrdersEnabled: true } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: courier.id, orderStatus: 'PENDING', paymentStatus: 'PAID', paymentMethod: 'CARD', deliveryAddress: customer.address, deliveryDate: new Date(`${todayKey}T12:00:00.000Z`), deliveryTime: '12:00', quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill(courierPassword)
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/|$)/)
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()
    const initialResponse = await page.request.get('/api/courier/next-order')
    expect(initialResponse.ok()).toBeTruthy()
    const initialOrder = await initialResponse.json() as { id: string }
    expect(initialOrder.id).toBe(orderId)

    await db.resourceAvailability.create({ data: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`), state: 'DISABLED', reason: `browser courier next disabled ${nonce}` } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toHaveCount(0)
    const disabledResponse = await page.request.get('/api/courier/next-order')
    expect(disabledResponse.ok()).toBeTruthy()
    const disabledOrder = await disabledResponse.json() as { message?: string; id?: string }
    expect(disabledOrder.message).toBe('No active orders')
    expect(disabledOrder.id).toBeUndefined()

    await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`) } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible()
    const restoredResponse = await page.request.get('/api/courier/next-order')
    expect(restoredResponse.ok()).toBeTruthy()
    const restoredOrder = await restoredResponse.json() as { id: string }
    expect(restoredOrder.id).toBe(orderId)
  } finally {
    if (courierId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courierId } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('courier stats exclude delivered orders on disabled courier days', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const courierEmail = `browser-courier-stats-scope-${nonce}@example.com`
  const courierPassword = `CourierStatsScope-${nonce.slice(0, 8)}`
  const orderNumber = 923000000 + Number.parseInt(nonce.replace(/\D/g, '').slice(0, 8), 10)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(9, '0').slice(-2)}-${String(today.getDate()).padStart(2, '0')}`
  let courierId: string | undefined
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: courierEmail, password: await bcrypt.hash(courierPassword, 10), name: `Browser Courier Stats Scope ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true, hasPassword: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser Courier Stats Customer ${nonce}`, phone: `+196${nonce.replace(/\D/g, '').slice(0, 9).padEnd(9, '6')}`, address: 'Courier stats browser address', createdBy: owner.id, isActive: true, autoOrdersEnabled: true } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: courier.id, orderStatus: 'DELIVERED', paymentStatus: 'PAID', paymentMethod: 'CARD', deliveryAddress: customer.address, deliveryDate: new Date(`${todayKey}T12:00:00.000Z`), deliveryTime: '12:00', deliveredAt: new Date(`${todayKey}T13:00:00.000Z`), quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(courierEmail)
    await page.locator('#password').fill(courierPassword)
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/|$)/)
    await expect(page.locator('[data-reference-command]')).toHaveCount(9)
    const initialResponse = await page.request.get(`/api/courier/stats?date=${todayKey}`)
    expect(initialResponse.ok()).toBeTruthy()
    const initialStats = await initialResponse.json() as { totalDelivered: number; todayDelivered: number }
    expect(initialStats).toEqual({ totalDelivered: 1, todayDelivered: 1 })

    await db.resourceAvailability.create({ data: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`), state: 'DISABLED', reason: `browser courier stats disabled ${nonce}` } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.locator('[data-reference-command]')).toHaveCount(9)
    const disabledResponse = await page.request.get(`/api/courier/stats?date=${todayKey}`)
    expect(disabledResponse.ok()).toBeTruthy()
    const disabledStats = await disabledResponse.json() as { totalDelivered: number; todayDelivered: number }
    expect(disabledStats).toEqual({ totalDelivered: 0, todayDelivered: 0 })

    await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courier.id, date: new Date(`${todayKey}T00:00:00.000Z`) } })
    await page.getByRole('button', { name: /Обновить|Yangilash|Refresh/i }).first().click()
    await expect(page.locator('[data-reference-command]')).toHaveCount(9)
    const restoredResponse = await page.request.get(`/api/courier/stats?date=${todayKey}`)
    expect(restoredResponse.ok()).toBeTruthy()
    const restoredStats = await restoredResponse.json() as { totalDelivered: number; todayDelivered: number }
    expect(restoredStats).toEqual({ totalDelivered: 1, todayDelivered: 1 })
  } finally {
    if (courierId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'COURIER', resourceId: courierId } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('client portal uses the flat role shell without duplicate legacy navigation', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+1888${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  try {
    const customer = await db.customer.create({ data: { name: 'Browser Client Shell', phone, address: 'Client Shell Address', autoOrdersEnabled: false } })
    customerId = customer.id
    const token = jwt.sign({ id: customer.id, phone, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'test-jwt-secret', { algorithm: 'HS256' })
    await page.addInitScript((value) => localStorage.setItem('customerToken', value), token)
    await page.goto('/sites/example-healthy-food/client')
    await expect(page.locator('[data-reference-command]')).toHaveCount(9)
    // The client rail exposes exactly the pages that are live in the workspace
    // (settings + orders); decorative entries are not rendered at all.
    await expect(page.locator('[data-reference-page]:visible')).toHaveCount(2)
    await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
    await page.locator('[data-reference-page="settings"]').click()
    await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Статус плана')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Client', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'History', exact: true })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(/Client dashboard|Welcome,|Phone:|Need full records|Open order history|Save location|Open map/)
  } finally {
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking dish expansion reveals editable persisted actual ingredients', async ({ page }, testInfo) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const planDate = new Date()
  planDate.setHours(0, 0, 0, 0)
  if (testInfo.project.name === 'Mobile Chrome') {
    // The mobile variant lists cooking records through the "this week" shortcut,
    // whose range is the Monday-start current week. Keep the plan date inside
    // that week (the raw +2 offset escapes it on weekends) and distinct from the
    // desktop tomorrow date so parallel projects never upsert the same record.
    const weekStart = new Date(planDate)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const desktopDate = new Date(planDate)
    desktopDate.setDate(desktopDate.getDate() + 1)
    planDate.setDate(planDate.getDate() + 2)
    if (planDate.getTime() > weekEnd.getTime()) {
      planDate.setTime(weekEnd.getTime())
      if (planDate.getTime() === desktopDate.getTime()) planDate.setDate(planDate.getDate() - 1)
    }
  } else {
    planDate.setDate(planDate.getDate() + 1)
  }
  const date = planDate.toISOString().slice(0, 10)
  const start = new Date('2025-12-04T00:00:00')
  const menuNumber = ((Math.floor((planDate.getTime() - start.getTime()) / 86400000) % 21) + 21) % 21 + 1
  const menuResponse = await page.request.get(`/api/admin/menus?number=${menuNumber}`)
  const menuPayload = menuResponse.ok() ? await menuResponse.json() : null
  const dish = menuPayload?.dishes?.[0] ?? { id: 1, name: 'Balish (Pirog)' }
  const dishId = String(dish.id)
  const save = await page.request.post('/api/admin/warehouse/cooking-plan', {
    data: {
      date: `${date}T00:00:00.000Z`,
      menuNumber,
      dishes: { [dishId]: 1 },
      consumption: [{ dishId, calorie: 1600, amount: 1, ingredients: [{ name: 'Browser actual rice', amount: 275, unit: 'g' }] }],
    },
  })
  expect(save.status()).toBe(200)
  const createdPlan = await save.json()
  const createdPlanId = createdPlan.plan?.id as string
  expect(createdPlanId).toEqual(expect.any(String))

  try {
    await page.locator('[data-reference-page="cooking"]').click()
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible()
    if (testInfo.project.name === 'Mobile Chrome') {
      await page.getByRole('button').filter({ hasText: /Menu/i }).first().click()
      await page.getByRole('button', { name: /эта неделя|shu hafta/i }).click()
      const createdCookingRow = page.locator(`[data-reference-resource-row="cooking"][data-resource-id="${createdPlanId}"]`)
      await expect(createdCookingRow).toBeVisible()
      await createdCookingRow.getByRole('button').first().click()
    }
    const cookingManager = page.locator('[data-reference-cooking-manager]')
    const colorPalette = cookingManager.getByLabel(/Цвет|Rang/).first()
    await expect(colorPalette).toBeVisible()
    await expect(page.locator('[data-reference-calendar="true"]')).toBeVisible()
    const selectedColor = colorPalette.getByRole('button', { name: '#2563eb' })
    await selectedColor.click()
    await expect(selectedColor).toHaveAttribute('aria-pressed', 'true')
    const draftSaveResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/warehouse/cooking-plan' && response.request().method() === 'POST' && response.ok())
    await cookingManager.getByRole('button', { name: /Сохранить расход|Sarfni saqlash/i }).click()
    const draftSavePayload = await (await draftSaveResponse).json()
    expect(draftSavePayload.plan.color).toBe('#2563eb')
    await expect(page.getByText(/Расход сохранен|Sarf saqlandi/i)).toBeVisible()
    const savedPlan = await (await page.request.get(`/api/admin/warehouse/cooking-plan?date=${date}`)).json()
    expect(savedPlan.id).toEqual(expect.any(String))
    expect(savedPlan.color).toBe('#2563eb')
    const cookingRow = page.locator(`[data-reference-resource-row="cooking"][data-resource-id="${savedPlan.id}"]`)
    await expect(cookingRow).toBeVisible()
    const cookingSelection = cookingRow.getByRole('checkbox')
    await cookingSelection.check()
    await expect(cookingSelection).toBeChecked()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="edit"]').click()
    const preparationPanel = page.getByRole('region', { name: /Подготовка готовки|Pishirish tayyorligi/i })
    await expect(page.getByRole('heading', { name: /Редактировать список готовки|Mavjud pishirish ro‘yxatini tahrirlash/i })).toBeVisible()
    const editedQuantity = 2
    await preparationPanel.getByLabel(`${dish.name} quantity`, { exact: true }).fill(String(editedQuantity))
    const preparationSaveResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/warehouse/cooking-plan' && response.request().method() === 'POST' && response.ok())
    await preparationPanel.getByRole('button', { name: 'Сохранить', exact: true }).click()
    const preparationSavePayload = await (await preparationSaveResponse).json()
    expect(preparationSavePayload.plan.id).toBe(savedPlan.id)
    expect(preparationSavePayload.plan.dishes[dishId]).toBe(editedQuantity)
    const editedPlan = await (await page.request.get(`/api/admin/warehouse/cooking-plan?date=${date}`)).json()
    expect(editedPlan.id).toBe(savedPlan.id)
    expect(editedPlan.dishes[dishId]).toBe(editedQuantity)
    const disabledRecord = await page.request.patch('/api/admin/warehouse/cooking-plan', { data: { id: savedPlan.id, isActive: false } })
    expect(disabledRecord.ok()).toBe(true)
    expect((await disabledRecord.json()).plan.isActive).toBe(false)
    const restoredRecord = await page.request.patch('/api/admin/warehouse/cooking-plan', { data: { id: savedPlan.id, deletedAt: false, isActive: true } })
    expect(restoredRecord.ok()).toBe(true)
    expect((await restoredRecord.json()).plan.isActive).toBe(true)
    const dishButton = page.getByRole('button', { name: new RegExp(String(dish.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first()
    await expect(dishButton).toBeVisible()
    await expect(dishButton).toHaveAttribute('aria-expanded', 'false')
    await dishButton.click()
    await expect(dishButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('[data-reference-cooking-consumption]')).toBeVisible()
    await expect(page.getByLabel(/Browser actual rice.*Фактический расход|Browser actual rice.*Haqiqiy sarf/i)).toHaveValue('275')
  } finally {
    const cleanup = await page.request.delete(`/api/admin/warehouse/cooking-plan?date=${date}`)
    expect([200, 404]).toContain(cleanup.status())
  }
})

test('cooking universal edit opens selected-elements view for multiple persisted records', async ({ page }) => {
  const now = new Date()
  const dates = [10, 11].map((day) => new Date(now.getFullYear(), now.getMonth(), day).toISOString().slice(0, 10))
  const planIds: string[] = []
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    for (const [index, date] of dates.entries()) {
      const response = await page.request.post('/api/admin/warehouse/cooking-plan', {
        data: { date: `${date}T00:00:00.000Z`, menuNumber: index + 1, dishes: { '1': 1 }, consumption: [] },
      })
      expect(response.status(), await response.text()).toBe(200)
      planIds.push((await response.json()).plan?.id as string)
    }
    await page.locator('[data-reference-page="cooking"]').click()
    await page.getByRole('button').filter({ hasText: /Menu/i }).first().click()
    await page.getByRole('button', { name: /этот месяц|bu oy/i }).click()
    for (const planId of planIds) {
      const row = page.locator(`[data-reference-resource-row="cooking"][data-resource-id="${planId}"]`)
      await expect(row).toBeVisible()
      await row.getByRole('checkbox').check()
    }
    await expect(page.locator('[data-reference-resource-row="cooking"] input[type="checkbox"]:checked')).toHaveCount(2)
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="cooking"]')
    await expect(selected).toBeVisible()
    await expect(selected.getByRole('list')).toContainText(dates[0])
    await expect(selected.getByRole('list')).toContainText(dates[1])
    await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
  } finally {
    for (const date of dates) await page.request.delete(`/api/admin/warehouse/cooking-plan?date=${date}`).catch(() => undefined)
  }
})

test('courier reassignment migrates future orders before disabling the source courier', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const middleEmail = process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com'
  const orderNumber = 910000000 + Number.parseInt(randomUUID().replace(/\D/g, '').slice(0, 8), 10)
  let sourceId: string | undefined
  let targetId: string | undefined
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: middleEmail }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const source = await db.admin.create({ data: { email: `browser-source-${nonce}@example.com`, name: 'Browser Source Courier', role: 'COURIER', createdBy: owner.id, isActive: true } })
    sourceId = source.id
    const target = await db.admin.create({ data: { email: `browser-target-${nonce}@example.com`, name: 'Browser Target Courier', role: 'COURIER', createdBy: owner.id, isActive: true } })
    targetId = target.id
    const customer = await db.customer.create({ data: { name: 'Browser Reassignment Customer', phone: `+1999${String(orderNumber).slice(-7)}`, address: 'Browser Reassignment Address', createdBy: owner.id, isActive: true, autoOrdersEnabled: true } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: source.id, orderStatus: 'PENDING', paymentStatus: 'PAID', deliveryAddress: customer.address, deliveryDate: new Date(Date.now() + 2 * 86_400_000), quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(middleEmail)
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const couriersPage = page.locator('[data-reference-page="couriers"]')
    await couriersPage.click()
    await expect(couriersPage).toHaveAttribute('aria-current', 'page')
    const sourceRow = page.getByRole('row').filter({ hasText: source.email })
    await expect(sourceRow).toBeVisible()
    const sourceCheckbox = sourceRow.getByRole('checkbox', { name: /select admin/i })
    await sourceCheckbox.check()
    await expect(sourceCheckbox).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-reference-command="disable"]')).toBeEnabled()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="disable"]').click()
    await expect(page.locator('[data-reference-command="disable"]')).toHaveAttribute('aria-pressed', 'true')
    const reassignmentLoad = page.waitForResponse((response) => response.url().includes(`/api/admin/couriers/reassign?courierId=${source.id}`) && response.request().method() === 'GET')
    await page.locator('[data-reference-local-actions]').getByRole('button', { name: /подтвердить|tasdiqlash|confirm/i }).click()
    const reassignmentResponse = await reassignmentLoad
    expect(reassignmentResponse.status()).toBe(200)
    const reassignmentBody = await reassignmentResponse.json()
    expect(reassignmentBody.courier?.id).toBe(source.id)
    await expect(page.locator('[data-reference-courier-reassignment-state]')).toHaveAttribute('data-reference-courier-reassignment-state', 'open')
    const reassignmentDialog = page.getByRole('dialog')
    await expect(reassignmentDialog).toBeVisible()
    await expect(reassignmentDialog).toContainText(source.name)
    await expect(reassignmentDialog).toContainText(String(orderNumber))
    await reassignmentDialog.getByRole('button', { name: /отмена|bekor qilish|cancel/i }).click()

    const preview = await page.request.get(`/api/admin/couriers/reassign?courierId=${source.id}`)
    expect(preview.status()).toBe(200)
    const previewBody = await preview.json()
    expect(previewBody.affectedOrders?.map((candidate: { id: string }) => candidate.id)).toContain(order.id)
    expect(previewBody.availableCouriers?.map((candidate: { id: string }) => candidate.id)).toContain(target.id)

    const save = await page.request.post('/api/admin/couriers/reassign', {
      data: { courierId: source.id, assignments: [{ orderId: order.id, targetCourierId: target.id }] },
    })
    expect(save.status()).toBe(200)
    const [sourceAfter, orderAfter] = await Promise.all([
      db.admin.findUnique({ where: { id: source.id }, select: { isActive: true } }),
      db.order.findUnique({ where: { id: order.id }, select: { courierId: true } }),
    ])
    expect(sourceAfter?.isActive).toBe(false)
    expect(orderAfter?.courierId).toBe(target.id)
    const notification = await db.message.findFirst({
      where: {
        senderId: owner.id,
        systemCode: 'COURIER_ASSIGNED',
        conversation: {
          OR: [
            { participant1Id: owner.id, participant2Id: target.id },
            { participant1Id: target.id, participant2Id: owner.id },
          ],
        },
      },
      select: { content: true },
    })
    expect(notification?.content).toContain(String(orderNumber))
  } finally {
    await Promise.allSettled([
      ...(orderId ? [db.order.delete({ where: { id: orderId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      ...(sourceId ? [db.admin.delete({ where: { id: sourceId } })] : []),
      ...(targetId ? [db.admin.delete({ where: { id: targetId } })] : []),
    ])
    await db.$disconnect()
  }
})

test('calculator Save and Finish create one linked purchase transaction in the browser session', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser Calculator Card ${nonce}`, color: '#059669', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const save = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser calculator draft ${nonce}`, items: [{ name: `Browser Calculator Ingredient ${nonce}`, amount: 1, unit: 'kg', costPerUnit: 100 }], idempotencyKey: `browser-calculator-${nonce}` },
    })
    expect(save.status()).toBe(201)
    const saved = await save.json()
    purchaseId = saved.purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    expect(saved.purchase?.status).toBe('DRAFT')

    const finish = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(finish.status()).toBe(200)
    const completed = await finish.json()
    expect(completed.purchase?.status).toBe('COMPLETED')
    const transactionId = completed.purchase?.transactionId
    expect(transactionId).toEqual(expect.any(String))
    const linkedTransaction = await db.transaction.findUnique({ where: { id: transactionId }, select: { virtualCardId: true, amount: true } })
    expect(linkedTransaction?.virtualCardId).toBe(card.id)
    expect(linkedTransaction?.amount).toBe(100)

    const history = await page.request.get('/api/admin/finance/purchases')
    expect(history.status()).toBe(200)
    const historyBody = await history.json()
    const historyPurchase = historyBody.purchases?.find((purchase: { id: string }) => purchase.id === purchaseId)
    expect(historyPurchase?.status).toBe('COMPLETED')

    await page.locator('[data-reference-page="calculator"]').click()
    await expect(page.getByText(`Browser calculator draft ${nonce}`, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Expand Browser calculator draft ${nonce}` }).click()
    await expect(page.locator('p').filter({ hasText: `Browser Calculator Card ${nonce}` }).first()).toBeVisible()
    await expect(page.getByText(transactionId, { exact: false })).toBeVisible()
    expect(historyPurchase?.transaction?.virtualCardId).toBe(card.id)
  } finally {
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    if (cardId) {
      await db.transaction.deleteMany({ where: { virtualCardId: cardId } }).catch(() => undefined)
      await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('calculator universal edit loads and persists an existing purchase draft row', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const title = `Browser Calculator Draft Edit ${nonce}`
  const ingredientName = `Browser Draft Ingredient ${nonce}`
  let purchaseId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title, items: [{ name: ingredientName, amount: 2, unit: 'kg', costPerUnit: 125 }], idempotencyKey: `browser-calculator-draft-edit-${nonce}` },
    })
    expect(createResponse.status(), await createResponse.text()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    if (!purchaseId) throw new Error('Created purchase id is missing')

    await page.locator('[data-reference-page="calculator"]').click()
    const row = page.locator(`[data-reference-resource-row="calculator"][data-resource-id="${purchaseId}"]`)
    await expect(row).toBeVisible()
    await row.locator('input[type="checkbox"]').check()
    await page.locator('[data-reference-command="edit"]').click()
    const editor = page.locator('[data-reference-calculator-draft-editor]')
    await expect(editor).toBeVisible()
    const amount = editor.getByLabel(`Количество ${ingredientName}`, { exact: true })
    await expect(amount).toHaveValue('2')
    await amount.fill('5')
    const patchResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/finance/purchases' && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([patchResponse, page.getByRole('button', { name: 'Сохранить список', exact: true }).click()])
    await expect.poll(async () => {
      const purchase = await db.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } })
      return purchase ? { id: purchase.id, status: purchase.status, amount: purchase.items[0]?.amount, totalCost: purchase.totalCost } : null
    }).toEqual({ id: purchaseId, status: 'DRAFT', amount: 5, totalCost: 625 })
    await expect(page.locator(`[data-reference-resource-row="calculator"][data-resource-id="${purchaseId}"]`)).toBeVisible()
  } finally {
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('finance card rail expands with persisted transaction history', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  let transactionId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser Finance Card ${nonce}`, color: '#059669', balance: 975 } })
    cardId = card.id
    const transaction = await db.transaction.create({ data: { adminId: owner.id, virtualCardId: card.id, amount: 25, type: 'EXPENSE', description: `Browser finance transaction ${nonce}`, category: 'MANUAL_ADJUSTMENT' } })
    transactionId = transaction.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="finance"]').click()

    const cardRail = page.getByRole('complementary', { name: /финансовые карты|moliya kartalari/i })
    await expect(cardRail).toContainText(`Browser Finance Card ${nonce}`)
    await cardRail.getByRole('button', { name: `Expand Browser Finance Card ${nonce}` }).click()
    await cardRail.getByRole('button', { name: new RegExp(`Browser Finance Card ${nonce}.*975 UZS`) }).click()
    await expect(cardRail).toContainText(`Browser finance transaction ${nonce}`)
    await expect(cardRail).toContainText('25')
    const disableResponse = page.waitForResponse((response) => response.url().includes('/api/admin/finance/cards') && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([disableResponse, page.locator('button').filter({ hasText: 'Отключить' }).last().click()])
    const disabledCards = await page.request.get('/api/admin/finance/cards')
    const disabledCard = (await disabledCards.json()).cards?.find((candidate: { id: string }) => candidate.id === card.id)
    expect(disabledCard?.isActive).toBe(false)
    await page.locator('[data-reference-page="calculator"]').click()
    await expect(page.locator('select[aria-label="Счёт оплаты"] option').filter({ hasText: `Browser Finance Card ${nonce}` })).toHaveCount(0)
    await page.locator('[data-reference-page="finance"]').click()
    await expect(cardRail.getByRole('button', { name: `Expand Browser Finance Card ${nonce}` })).toBeVisible()
    await cardRail.getByRole('button', { name: `Expand Browser Finance Card ${nonce}` }).click()
    await cardRail.getByRole('button', { name: new RegExp(`Browser Finance Card ${nonce}.*975 UZS`) }).click()
    const enableResponse = page.waitForResponse((response) => response.url().includes('/api/admin/finance/cards') && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([enableResponse, page.locator('button').filter({ hasText: 'Включить' }).last().click()])
    const enabledCards = await page.request.get('/api/admin/finance/cards')
    const enabledCard = (await enabledCards.json()).cards?.find((candidate: { id: string }) => candidate.id === card.id)
    expect(enabledCard?.isActive).toBe(true)
    await cardRail.getByRole('button', { name: new RegExp(`Browser Finance Card ${nonce}.*975 UZS`) }).click()
    await page.getByRole('main').getByRole('button', { name: /Изменить|Tahrirlash/i }).click()
    const cardEditName = page.getByRole('main').getByLabel(/Название карты|Karta nomi/i)
    await cardEditName.fill(`Edited Finance Card ${nonce}`)
    await page.getByRole('main').getByRole('button', { name: '#2563eb' }).click()
    const cardEditResponse = page.waitForResponse((response) => response.url().includes('/api/admin/finance/cards') && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([cardEditResponse, page.getByRole('main').getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()])
    const editedCard = await db.virtualCard.findUnique({ where: { id: card.id }, select: { name: true, color: true } })
    expect(editedCard).toEqual({ name: `Edited Finance Card ${nonce}`, color: '#2563eb' })
    await cardRail.getByRole('button', { name: new RegExp(`Edited Finance Card ${nonce}.*975 UZS`) }).click()
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const cardDay = cardRail.getByRole('button', { name: /Включен/ }).first()
    await expect(cardDay).toBeVisible()
    const disableDayResponse = page.waitForResponse((response) => response.url().includes('/api/admin/resource-availability') && response.request().method() === 'PUT' && response.ok())
    await Promise.all([disableDayResponse, cardDay.click()])
    const disabledDayResponse = await page.request.get(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${encodeURIComponent(card.id)}&from=${today}&to=${today}`)
    const disabledDay = (await disabledDayResponse.json()).overrides?.find((override: { date: string }) => override.date.slice(0, 10) === today)
    expect(disabledDay?.state).toBe('DISABLED')
    const restoreDayResponse = page.waitForResponse((response) => response.url().includes('/api/admin/resource-availability') && response.request().method() === 'PUT' && response.ok())
    await Promise.all([restoreDayResponse, cardRail.getByRole('button', { name: /Отключен/ }).first().click()])
    const restoredDayResponse = await page.request.get(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${encodeURIComponent(card.id)}&from=${today}&to=${today}`)
    const restoredDay = (await restoredDayResponse.json()).overrides?.find((override: { date: string }) => override.date.slice(0, 10) === today)
    expect(restoredDay?.state).toBe('ENABLED')
    await cardRail.getByRole('button', { name: new RegExp(`Edited Finance Card ${nonce}.*975 UZS`) }).click()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    const universalTrashResponse = page.waitForResponse((response) => response.url().includes('/api/admin/finance/cards') && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([universalTrashResponse, page.getByRole('button', { name: 'Подтвердить', exact: true }).click()])
    const trashedCard = await db.virtualCard.findUnique({ where: { id: card.id }, select: { deletedAt: true } })
    expect(trashedCard?.deletedAt).not.toBeNull()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    await expect(cardRail).toContainText(`Edited Finance Card ${nonce}`)
    await cardRail.getByRole('button', { name: new RegExp(`Edited Finance Card ${nonce}.*975 UZS`) }).click()
    const universalRestoreResponse = page.waitForResponse((response) => response.url().includes('/api/admin/finance/cards') && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([universalRestoreResponse, page.locator('[data-reference-command="create"]').click()])
    const restoredCard = await db.virtualCard.findUnique({ where: { id: card.id }, select: { deletedAt: true } })
    expect(restoredCard?.deletedAt).toBeNull()
  } finally {
    if (transactionId) await db.transaction.delete({ where: { id: transactionId } }).catch(() => undefined)
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('calculator period demand joins active assigned-set clients and excludes a disabled JSON group across a selected week', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let activeSetId: string | undefined
  let availabilityId: string | undefined
  let calculatorCardId: string | undefined
  let calculatorUiPurchaseId: string | undefined
  let calculatorUiTransactionId: string | undefined
  let legacyImmediateBuyCalls = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/admin/finance/buy-ingredients') legacyImmediateBuyCalls += 1
  })
  const customerIds: string[] = []
  const orderIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const group = {
      id: `calculator-group-${nonce}`,
      name: '1600',
      calories: 1600,
      dishes: [{
        dishId: 1,
        dishName: `Calculator fixture dish ${nonce}`,
        mealType: 'LUNCH',
        customIngredients: [{ name: `Calculator range ingredient ${nonce}`, amount: 100, unit: 'gr' }],
      }],
    }
    const calorieGroups = Object.fromEntries(Array.from({ length: 21 }, (_, index) => [String(index + 1), [group]]))
    const activeSet = await db.menuSet.create({
      data: { name: `Calculator range set ${nonce}`, adminId: owner.id, isActive: false, menuNumber: 0, calorieGroups },
    })
    activeSetId = activeSet.id
    const calculatorCard = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Calculator UI Card ${nonce}`, color: '#059669', balance: 100000 } })
    calculatorCardId = calculatorCard.id
    const activeCustomer = await db.customer.create({
      data: { name: `Calculator active ${nonce}`, phone: `+99890${String(Date.now()).slice(-7)}1`, address: 'Calculator test', createdBy: owner.id, calories: 1600, assignedSetId: activeSet.id, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }) },
    })
    const inactiveCustomer = await db.customer.create({
      data: { name: `Calculator inactive ${nonce}`, phone: `+99890${String(Date.now()).slice(-7)}2`, address: 'Calculator test', createdBy: owner.id, calories: 1600, isActive: false, assignedSetId: activeSet.id, deliveryDays: JSON.stringify({}) },
    })
    customerIds.push(activeCustomer.id, inactiveCustomer.id)
    const orderNumberBase = 930000000 + Number.parseInt(randomUUID().replace(/\D/g, '').slice(0, 8), 10)
    const weekStart = new Date()
    weekStart.setHours(12, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    for (let index = 0; index < 7; index += 1) {
      const deliveryDate = new Date(weekStart)
      deliveryDate.setDate(weekStart.getDate() + index)
      const order = await db.order.create({
        data: { orderNumber: orderNumberBase + index, customerId: activeCustomer.id, adminId: owner.id, deliveryDate, deliveryAddress: 'Calculator test', calories: 1600, quantity: 1 },
      })
      orderIds.push(order.id)
    }
    const disabledDate = new Date(weekStart)
    disabledDate.setDate(weekStart.getDate() + 2)
    const availability = await db.resourceAvailability.create({
      data: { resourceType: 'GROUP', resourceId: `${activeSet.id}:${group.id}`, date: disabledDate, state: 'DISABLED', reason: 'browser proof' },
    })
    availabilityId = availability.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const clientsLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/clients' && response.ok())
    const ordersLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/orders' && response.ok())
    const setsLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/sets' && response.ok())
    const groupAvailabilityLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/resource-availability' && new URL(response.url()).searchParams.get('resourceType') === 'GROUP' && response.ok())
    await page.locator('[data-reference-page="calculator"]').click()
    const [clientsResponse, ordersResponse, setsResponse, groupAvailabilityResponse] = await Promise.all([clientsLoaded, ordersLoaded, setsLoaded, groupAvailabilityLoaded])
    const loadedClients = await clientsResponse.json()
    const loadedOrders = await ordersResponse.json()
    const loadedSets = await setsResponse.json()
    expect(Array.isArray(loadedClients) && loadedClients.some((client: { id: string }) => client.id === activeCustomer.id)).toBe(true)
    expect(Array.isArray(loadedOrders)).toBe(true)
    expect(Array.isArray(loadedSets) && loadedSets.some((set: { id: string }) => set.id === activeSet.id)).toBe(true)
    const loadedAvailability = await groupAvailabilityResponse.json()
    expect(loadedAvailability.overrides.some((override: { resourceId: string; date: string; state: string }) => override.resourceId === `${activeSet.id}:${group.id}` && override.date.slice(0, 10) === disabledDate.toISOString().slice(0, 10) && override.state === 'DISABLED')).toBe(true)
    const calculatorRange = page.getByRole('button').filter({ hasText: /menu/i })
    await expect(calculatorRange).toBeVisible()
    await calculatorRange.click()
    await page.getByRole('button', { name: /эта неделя|shu hafta/i }).dispatchEvent('click')
    await expect(calculatorRange).not.toContainText(/за все время|barcha vaqt/i)
    await page.getByRole('button', { name: /сбросить|tozalash/i }).click()
    const disabledDayButton = page.locator('button[name="day"]:not(.day-outside)').filter({ hasText: new RegExp(`^${disabledDate.getDate()}$`) }).first()
    await expect(disabledDayButton).toBeVisible()
    await disabledDayButton.click()
    await page.getByRole('button').filter({ hasText: /рассчит|расч[её]т/i }).last().click()
    await expect(page.getByText(`Calculator range ingredient ${nonce}`, { exact: true })).toHaveCount(0)
    await expect(page.locator('[data-reference-calculator-warning]')).toHaveCount(0)
    await page.getByRole('button').filter({ hasText: /menu/i }).click()
    await page.getByRole('button', { name: /эта неделя|shu hafta/i }).click()
    await page.getByRole('button').filter({ hasText: /рассчит|расч[её]т/i }).last().click()
    await expect(page.getByText(`Calculator range ingredient ${nonce}`, { exact: true }).first()).toBeVisible()
    await expect(page.getByText('600 gr', { exact: true }).first()).toBeVisible()
    await expect(page.locator('[data-reference-calculator-warning]').filter({ hasText: new RegExp(`Calculator range ingredient ${nonce}`) })).toBeVisible()
    await expect(page.locator('select[aria-label="Счёт оплаты"] option').filter({ hasText: `Calculator UI Card ${nonce}` })).toBeAttached()
    await page.locator('select[aria-label="Счёт оплаты"]').selectOption(calculatorCard.id)
    const calculatorUiSaveResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/finance/purchases' && response.request().method() === 'POST' && response.ok())
    await page.getByRole('button', { name: /сохранить список/i }).click()
    const calculatorUiSaved = await (await calculatorUiSaveResponse).json()
    calculatorUiPurchaseId = calculatorUiSaved.purchase?.id
    expect(calculatorUiPurchaseId).toEqual(expect.any(String))
    expect(calculatorUiSaved.purchase?.status).toBe('DRAFT')
    const calculatorUiFinishResponse = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/complete') && response.request().method() === 'POST' && response.ok())
    await page.getByRole('button', { name: /завершить покупку/i }).click()
    const calculatorUiFinished = await (await calculatorUiFinishResponse).json()
    expect(calculatorUiFinished.purchase?.id).toBe(calculatorUiPurchaseId)
    expect(calculatorUiFinished.purchase?.status).toBe('COMPLETED')
    calculatorUiTransactionId = calculatorUiFinished.purchase?.transactionId
    expect(calculatorUiTransactionId).toEqual(expect.any(String))
    expect(legacyImmediateBuyCalls).toBe(0)
  } finally {
    if (calculatorUiPurchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId: calculatorUiPurchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: calculatorUiPurchaseId } }).catch(() => undefined)
    }
    if (calculatorUiTransactionId) await db.transaction.delete({ where: { id: calculatorUiTransactionId } }).catch(() => undefined)
    if (calculatorCardId) await db.virtualCard.delete({ where: { id: calculatorCardId } }).catch(() => undefined)
    if (availabilityId) await db.resourceAvailability.delete({ where: { id: availabilityId } }).catch(() => undefined)
    if (orderIds.length) await db.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
    if (customerIds.length) await db.customer.deleteMany({ where: { id: { in: customerIds } } }).catch(() => undefined)
    if (activeSetId) await db.menuSet.delete({ where: { id: activeSetId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('chat visibly selects a reply branch and persists its pointer', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let remoteId: string | undefined
  let conversationId: string | undefined
  let sentMessageId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `reply-${nonce}@example.com`, name: `Reply Courier ${nonce}`, role: 'COURIER', phone: `+99890${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const conversation = await db.conversation.create({ data: { participant1Id: owner.id, participant2Id: remote.id, lastMessage: `Original ${nonce}` } })
    conversationId = conversation.id
    await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, name: remote.name, phone: remote.phone || '', color: '#059669', icon: 'user' } })
    const original = await db.message.create({ data: { conversationId: conversation.id, senderId: remote.id, content: `Original ${nonce}` } })

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    await page.getByText(remote.name, { exact: true }).click()
    await expect(page.locator('div.text-sm.leading-6').filter({ hasText: original.content })).toBeVisible()

    const replyButton = page.getByRole('button', { name: /ответить|javob berish/i }).first()
    await expect(replyButton).toBeVisible()
    await replyButton.click()
    await expect(page.getByText(original.content, { exact: true }).last()).toBeVisible()
    const input = page.getByPlaceholder(/напишите сообщение|xabar yozing/i)
    await input.fill(`Reply ${nonce}`)
    await page.getByRole('button', { name: /отправить|yuborish/i }).click()
    await expect(page.getByText(`Reply ${nonce}`, { exact: true })).toBeVisible()
    const sent = await db.message.findFirst({ where: { conversationId: conversation.id, content: `Reply ${nonce}` }, select: { id: true, replyToMessageId: true } })
    sentMessageId = sent?.id
    expect(sent?.replyToMessageId).toBe(original.id)
  } finally {
    if (conversationId) await db.conversation.delete({ where: { id: conversationId } }).catch(() => undefined)
    if (remoteId) {
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('disabled chat contact stays readable but blocks sending in the browser', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let remoteId: string | undefined
  let conversationId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `disabled-${nonce}@example.com`, name: `Disabled Contact ${nonce}`, role: 'COURIER', phone: `+99891${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const conversation = await db.conversation.create({ data: { participant1Id: owner.id, participant2Id: remote.id, lastMessage: `Disabled message ${nonce}` } })
    conversationId = conversation.id
    await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'DISABLED', name: remote.name, phone: remote.phone || '', color: '#64748b', icon: 'user' } })
    await db.message.create({ data: { conversationId: conversation.id, senderId: remote.id, content: `Disabled message ${nonce}` } })

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    await page.getByText(remote.name, { exact: true }).click()
    const input = page.getByPlaceholder(/контакт отключен|kontakt o'chirilgan/i)
    await expect(input).toBeDisabled()
    await expect(page.getByRole('button', { name: /отправить|yuborish/i })).toBeDisabled()
    await expect(page.getByText(`Disabled message ${nonce}`, { exact: true }).last()).toBeVisible()
  } finally {
    if (conversationId) await db.conversation.delete({ where: { id: conversationId } }).catch(() => undefined)
    if (remoteId) {
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('internal auto-SMS persists enabled messages and skips disabled recipients', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const content = `Browser internal auto SMS ${nonce}`
  let remoteId: string | undefined
  let firstContactId: string | undefined
  let reverseContactId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true, name: true } })
    if (!owner) throw new Error('Browser auto-SMS owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `auto-sms-${nonce}@example.com`, name: `Auto SMS Contact ${nonce}`, role: 'COURIER', phone: `+99892${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const firstContact = await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'ENABLED', name: remote.name, phone: remote.phone || '', color: '#2563eb', icon: 'user' } })
    firstContactId = firstContact.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const first = await page.request.post('/api/chat/auto-sms', { data: { contactIds: [firstContact.id], content } })
    expect(first.status()).toBe(200)
    expect(await first.json()).toMatchObject({ success: true, sent: 1, skipped: 0 })
    expect(await db.message.count({ where: { content } })).toBe(1)

    const reverse = await db.chatContact.create({ data: { ownerAdminId: remote.id, adminId: owner.id, state: 'DISABLED', name: owner.name, phone: '', color: '#64748b', icon: 'user' } })
    reverseContactId = reverse.id
    const second = await page.request.post('/api/chat/auto-sms', { data: { contactIds: [firstContact.id], content: `${content} disabled` } })
    expect(second.status()).toBe(200)
    expect(await second.json()).toMatchObject({ success: true, sent: 0, skipped: 1 })
    expect(await db.message.count({ where: { content: `${content} disabled` } })).toBe(0)
  } finally {
    if (remoteId) {
      await db.message.deleteMany({ where: { content: { startsWith: content } } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { OR: [{ participant1Id: remoteId }, { participant2Id: remoteId }] } }).catch(() => undefined)
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    if (firstContactId) await db.chatContact.delete({ where: { id: firstContactId } }).catch(() => undefined)
    if (reverseContactId) await db.chatContact.delete({ where: { id: reverseContactId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('Chat does not poll conversations in a hidden background loop', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/chat/conversations') || request.url().includes('/api/chat/messages')) requests.push(request.url())
  })
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.locator('[data-reference-page="chat"]').click()
  await expect(page.getByText(/Система|System|Tizim/).first()).toBeVisible()
  await page.waitForTimeout(250)
  const initialRequestCount = requests.length
  await page.waitForTimeout(5500)
  expect(requests.length).toBe(initialRequestCount)
})

test('universal SMS mode sends through the Chat auto-message composer', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const content = `Browser universal auto SMS ${nonce}`
  let remoteId: string | undefined
  let contactId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser universal SMS owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `universal-sms-${nonce}@example.com`, name: `Universal SMS ${nonce}`, role: 'COURIER', phone: `+99894${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const contact = await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'ENABLED', name: remote.name, phone: remote.phone || '', color: '#2563eb', icon: 'user' } })
    contactId = contact.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    const contactRow = page.getByText(remote.name, { exact: true }).first()
    await expect(contactRow).toBeVisible()
    await page.getByLabel(new RegExp(`Выбрать ${remote.name}|Tanlash ${remote.name}`)).check()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="sms"]').click()
    await expect(page.getByRole('status')).toContainText(/внутренних авто-сообщений|Ichki avto-xabar rejimi/i)
    const composer = page.getByLabel(/Текст сообщения|Xabar matni/i)
    await composer.fill(content)
    await page.getByRole('button', { name: /Отправить|Yuborish/i }).last().click()
    await expect.poll(() => db.message.count({ where: { content } })).toBe(1)
  } finally {
    if (remoteId) {
      await db.message.deleteMany({ where: { content } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { OR: [{ participant1Id: remoteId }, { participant2Id: remoteId }] } }).catch(() => undefined)
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    if (contactId) await db.chatContact.delete({ where: { id: contactId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal SMS mode reports skipped disabled recipients in Chat', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const content = `Browser skipped auto SMS ${nonce}`
  let remoteId: string | undefined
  let reverseContactId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true, email: true } })
    if (!owner) throw new Error('Browser skipped SMS owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `skipped-sms-${nonce}@example.com`, name: `Skipped SMS ${nonce}`, role: 'COURIER', phone: `+99895${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'DISABLED', name: remote.name, phone: remote.phone || '', color: '#64748b', icon: 'user' } })
    const reverse = await db.chatContact.create({ data: { ownerAdminId: remote.id, adminId: owner.id, state: 'DISABLED', name: owner.email, phone: '', color: '#64748b', icon: 'user' } })
    reverseContactId = reverse.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    await expect(page.getByText(remote.name, { exact: true })).toBeVisible()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="sms"]').click()
    const disabledCheckbox = page.getByLabel(new RegExp(`Выбрать ${remote.name}|Tanlash ${remote.name}`))
    await disabledCheckbox.check()
    await expect(page.getByRole('status')).toContainText(/внутренних авто-сообщений|Ichki avto-xabar rejimi/i)
    const composer = page.getByLabel(/Текст сообщения|Xabar matni/i)
    await composer.fill(content)
    await page.getByRole('button', { name: /Отправить|Yuborish/i }).last().click()
    await expect(page.getByText(/0 отправлено, 1 пропущено|0 ta yuborildi, 1 ta o'tkazib yuborildi/i)).toBeVisible()
    await expect.poll(() => db.message.count({ where: { content } })).toBe(0)
  } finally {
    if (remoteId) {
      await db.message.deleteMany({ where: { content } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { OR: [{ participant1Id: remoteId }, { participant2Id: remoteId }] } }).catch(() => undefined)
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    if (reverseContactId) await db.chatContact.delete({ where: { id: reverseContactId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('chat contact calendar overrides preserve the contact graph', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = '2026-09-04'
  let remoteId: string | undefined
  let contactId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser Chat calendar owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `chat-calendar-${nonce}@example.com`, name: `Chat Calendar ${nonce}`, role: 'COURIER', phone: `+99893${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const contact = await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'ENABLED', name: remote.name, phone: remote.phone || '', color: '#2563eb', icon: 'user' } })
    contactId = contact.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const write = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'CHAT_CONTACT', resourceId: contact.id, date, state: 'DISABLED', reason: `browser chat calendar ${nonce}` } })
    expect(write.status()).toBe(200)
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=CHAT_CONTACT&resourceId=${contact.id}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    expect((await read.json()).overrides[0]).toMatchObject({ resourceType: 'CHAT_CONTACT', resourceId: contact.id, state: 'DISABLED' })
    expect(await db.chatContact.findUnique({ where: { id: contact.id }, select: { id: true } })).toMatchObject({ id: contact.id })
    const remove = await page.request.delete(`/api/admin/resource-availability?resourceType=CHAT_CONTACT&resourceId=${contact.id}&date=${date}`)
    expect(remove.status()).toBe(200)
    expect((await (await page.request.get(`/api/admin/resource-availability?resourceType=CHAT_CONTACT&resourceId=${contact.id}&from=${date}&to=${date}`)).json()).overrides).toHaveLength(0)
  } finally {
    if (contactId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'CHAT_CONTACT', resourceId: contactId } }).catch(() => undefined)
    if (contactId) await db.chatContact.delete({ where: { id: contactId } }).catch(() => undefined)
    if (remoteId) await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('system chat contact is readable but protected from sending in the browser', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.locator('[data-reference-page="chat"]').click()
  const systemContact = page.getByText(/^(Система|System|Tizim)$/).first()
  await expect(systemContact).toBeVisible()
  await systemContact.click()
  const input = page.getByPlaceholder(/система|tizim/i)
  await expect(input).toBeDisabled()
  await expect(page.getByRole('button', { name: /отправить|yuborish/i })).toBeDisabled()
})

test('deleted chat contact remains readable in the trash filter', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let remoteId: string | undefined
  let conversationId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const remote = await db.admin.create({ data: { email: `deleted-${nonce}@example.com`, name: `Deleted Contact ${nonce}`, role: 'COURIER', phone: `+99892${String(Date.now()).slice(-7)}`, hasPassword: false } })
    remoteId = remote.id
    const conversation = await db.conversation.create({ data: { participant1Id: owner.id, participant2Id: remote.id, lastMessage: `Deleted message ${nonce}` } })
    conversationId = conversation.id
    await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'DELETED', name: remote.name, phone: remote.phone || '', color: '#64748b', icon: 'user' } })
    await db.message.create({ data: { conversationId: conversation.id, senderId: remote.id, content: `Deleted message ${nonce}` } })

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    await page.getByLabel('Состояние контактов').getByRole('button', { name: /корзина|savat/i }).click()
    await expect(page.getByText(remote.name, { exact: true })).toBeVisible()
    await page.getByText(remote.name, { exact: true }).click()
    await expect(page.getByText(`Deleted message ${nonce}`, { exact: true }).last()).toBeVisible()
    await expect(page.getByPlaceholder(/напишите сообщение|xabar yozing/i)).not.toBeDisabled()
  } finally {
    if (conversationId) await db.conversation.delete({ where: { id: conversationId } }).catch(() => undefined)
    if (remoteId) {
      await db.chatContact.deleteMany({ where: { adminId: remoteId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('extracted client directory tab hydrates for middle admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const clientsTab = page.locator('[data-reference-page="clients"]')
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
  await page.locator('[data-reference-page="clients"]').click()
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

test('courier portal does not install recurring polling timers', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetInterval = window.setInterval.bind(window)
    const recorded: number[] = []
    ;(window as unknown as { __courierIntervals?: number[] }).__courierIntervals = recorded
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (window.location.pathname === '/courier' && (timeout === 45000 || timeout === 60000)) recorded.push(timeout)
      return originalSetInterval(handler, timeout, ...args)
    }) as typeof window.setInterval
  })
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('courier@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/courier(?:\/|$)/)
  await expect(page.locator('body')).not.toContainText(/application error|unhandled runtime error/i)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __courierIntervals?: number[] }).__courierIntervals ?? [])).toEqual([])
})

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

test('courier cannot create admin orders', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('courier@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/courier(?:\/|$)/)

    const response = await page.request.post('/api/orders', {
      data: {
        customerName: 'Courier Must Not Create',
        customerPhone: phone,
        deliveryAddress: 'Tashkent',
        calories: 1600,
      },
    })
    expect(response.status()).toBe(403)
  } finally {
    const customer = await db.customer.findFirst({ where: { phone }, select: { id: true } })
    if (customer) await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.deleteMany({ where: { phone } })
    await db.$disconnect()
  }
})

test('courier creation rejects unsafe salary input', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/couriers', {
    data: {
      name: 'Browser Invalid Salary Courier',
      email: `invalid-salary-${Date.now()}@example.com`,
      password: 'test-password',
      salary: 'not-a-number',
    },
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

test('middle admin auto-order trigger excludes out-of-scope clients', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const today = dayNames[new Date().getDay()]
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Auto Order Scope Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      isActive: true,
      autoOrdersEnabled: true,
      orderPattern: JSON.stringify({ [today]: true }),
      calories: 1600,
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/clients/run-auto-orders')
    expect(response.status()).toBe(200)
    expect(await db.order.findFirst({ where: { customerId: customer.id, fromAutoOrder: true }, select: { id: true } })).toBeNull()
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('legacy auto-order trigger honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = today.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: {
      name: `Browser Legacy Contract Disabled ${nonce}`,
      phone: `+1782${String(Date.now()).slice(-7)}`,
      address: 'Legacy scheduler browser address',
      createdBy: owner.id,
      isActive: true,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      orderPattern: 'daily',
      calories: 1600,
    }, select: { id: true } })
    customerId = customer.id
    const contract = await db.contract.create({ data: {
      customerId: customer.id,
      ownerAdminId: owner.id,
      status: 'ENABLED',
      periods: { create: {
        startDate: today,
        endDate: new Date(today.getTime() + 86_400_000),
        status: 'ENABLED',
        enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        disabledDates: [todayKey],
      } },
    }, select: { id: true } })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/clients/run-auto-orders')
    expect(response.status()).toBe(200)
    expect(await db.order.findFirst({ where: { customerId: customer.id, fromAutoOrder: true }, select: { id: true } })).toBeNull()
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('schedule status does not create orders', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Schedule Read-Only Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      isActive: true,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      calories: 1600,
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.get('/api/admin/auto-orders/schedule')
    expect(response.status()).toBe(200)
    expect(await db.order.count({ where: { customerId: customer.id } })).toBe(0)
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin schedule excludes out-of-scope clients', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Scheduled Auto Order Scope Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      calories: 1600,
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/auto-orders/schedule')
    expect(response.status()).toBe(200)
    expect(await db.order.count({ where: { customerId: customer.id } })).toBe(0)
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('auto-order forecast does not create orders', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const everyDay = Object.fromEntries(dayNames.map((day) => [day, true]))
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Forecast Read-Only Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify(everyDay),
      calories: 1600,
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.get('/api/admin/auto-orders/client')
    expect(response.status()).toBe(200)
    expect(await db.order.findFirst({ where: { customerId: customer.id }, select: { id: true } })).toBeNull()
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin auto-order stats exclude out-of-scope clients', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Auto Order Stats Scope Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      orderPattern: 'daily',
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.get('/api/admin/auto-orders/create')
    expect(response.status()).toBe(200)
    const data = await response.json() as { tomorrowPreview?: { clients?: Array<{ id?: string }> } }
    expect(data.tomorrowPreview?.clients?.some((client) => client.id === customer.id)).toBe(false)
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin cannot create auto-orders for an out-of-scope client', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const today = dayNames[new Date().getDay()]
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: {
      name: 'Browser Per-Client Auto Order Scope Client',
      phone,
      address: 'Tashkent',
      createdBy: superAdmin!.id,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ [today]: true }),
      calories: 1600,
    },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/auto-orders/client', {
      data: { clientId: customer.id, daysAhead: 0 },
    })
    expect(response.status()).toBe(404)
    expect(await db.order.findFirst({ where: { customerId: customer.id, fromAutoOrder: true }, select: { id: true } })).toBeNull()
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('per-client auto-order creation honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const target = new Date()
    target.setDate(target.getDate() + 1)
    target.setHours(0, 0, 0, 0)
    const targetDate = target.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: { name: `Browser Per Client Contract Disabled ${nonce}`, phone: `+1781${String(Date.now()).slice(-7)}`, address: 'Per-client scheduler browser address', createdBy: owner.id, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }), autoOrdersEnabled: true } })
    customerId = customer.id
    const start = new Date(target)
    start.setDate(start.getDate() - 1)
    const end = new Date(target)
    end.setDate(end.getDate() + 1)
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', periods: { create: { startDate: start, endDate: end, status: 'ENABLED', enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], disabledDates: [targetDate] } } }, select: { id: true } })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/auto-orders/client', { data: { clientId: customer.id, daysAhead: 1 } })
    expect(response.status()).toBe(200)
    const createdForDisabledDate = await db.order.findFirst({ where: { customerId: customer.id, deliveryDate: { gte: target, lt: new Date(target.getTime() + 86400000) } }, select: { id: true } })
    expect(createdForDisabledDate).toBeNull()
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('30-day legacy auto-order creator honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const target = new Date()
    target.setHours(0, 0, 0, 0)
    target.setDate(target.getDate() + 1)
    const targetDate = target.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: {
      name: `Browser Legacy 30 Day Contract Disabled ${nonce}`,
      phone: `+1783${String(Date.now()).slice(-7)}`,
      address: 'Legacy 30-day scheduler browser address',
      createdBy: owner.id,
      isActive: true,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      orderPattern: 'daily',
      calories: 1600,
    }, select: { id: true } })
    customerId = customer.id
    const contract = await db.contract.create({ data: {
      customerId: customer.id,
      ownerAdminId: owner.id,
      status: 'ENABLED',
      periods: { create: {
        startDate: new Date(target.getTime() - 86_400_000),
        endDate: new Date(target.getTime() + 86_400_000),
        status: 'ENABLED',
        enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        disabledDates: [targetDate],
      } },
    }, select: { id: true } })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/auto-orders/create', { data: { targetDate } })
    expect(response.status()).toBe(200)
    expect(await db.order.findFirst({ where: { customerId: customer.id, deliveryDate: { gte: target, lt: new Date(target.getTime() + 86_400_000) } }, select: { id: true } })).toBeNull()
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('30-day auto-order preview honors disabled contract-period dates', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    const target = new Date(base)
    target.setDate(target.getDate() + 1)
    const baseDate = base.toISOString().slice(0, 10)
    const targetDate = target.toISOString().slice(0, 10)
    const customer = await db.customer.create({ data: {
      name: `Browser Legacy Preview Contract Disabled ${nonce}`,
      phone: `+1784${String(Date.now()).slice(-7)}`,
      address: 'Legacy preview scheduler browser address',
      createdBy: owner.id,
      isActive: true,
      autoOrdersEnabled: true,
      deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
      orderPattern: 'daily',
      calories: 1600,
    }, select: { id: true } })
    customerId = customer.id
    const contract = await db.contract.create({ data: {
      customerId: customer.id,
      ownerAdminId: owner.id,
      status: 'ENABLED',
      periods: { create: {
        startDate: base,
        endDate: new Date(target.getTime() + 86_400_000),
        status: 'ENABLED',
        enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        disabledDates: [targetDate],
      } },
    }, select: { id: true } })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.get(`/api/admin/auto-orders/create?date=${baseDate}`)
    expect(response.status()).toBe(200)
    const data = await response.json() as { tomorrowPreview?: { clients?: Array<{ id?: string }> } }
    expect(data.tomorrowPreview?.clients?.some((client) => client.id === customer.id)).toBe(false)
  } finally {
    if (customerId) await db.order.deleteMany({ where: { customerId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal edit opens and persists the selected client', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const customer = await db.customer.create({ data: {
      name: `Browser Universal Edit Client ${nonce}`,
      phone: `+1785${String(Date.now()).slice(-7)}`,
      address: 'Universal edit browser address',
      createdBy: owner.id,
      calories: 1600,
      autoOrdersEnabled: false,
    }, select: { id: true } })
    customerId = customer.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="clients"]').click()
    const selection = page.getByRole('checkbox', { name: `Select client Browser Universal Edit Client ${nonce}` })
    await expect(selection).toBeVisible()
    await selection.check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const nameInput = page.locator('#clientName')
    await expect(nameInput).toHaveValue(`Browser Universal Edit Client ${nonce}`)
    await nameInput.fill(`Browser Universal Edited Client ${nonce}`)
    await page.getByRole('button', { name: /Сохранить|Saqlash/i }).last().click()
    await expect.poll(async () => (await db.customer.findUnique({ where: { id: customer.id }, select: { name: true } }))?.name).toBe(`Browser Universal Edited Client ${nonce}`)
  } finally {
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal admin edit opens selected-elements screen for multiple admins', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const names = [`Browser Multi Admin A ${nonce}`, `Browser Multi Admin B ${nonce}`]
  const emailPrefix = `browser-multi-admin-${nonce}`
  const adminIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser multi-admin Edit owner fixture is missing')
    for (const [index, name] of names.entries()) {
      const admin = await db.admin.create({ data: { name, email: `${emailPrefix}-${index}@example.invalid`, password: 'browser-password-123', role: 'LOW_ADMIN', createdBy: owner.id, isActive: true } })
      adminIds.push(admin.id)
    }

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="admins"]').click()
    for (const name of names) await page.getByRole('checkbox', { name: `Select admin ${name}` }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const selected = page.locator('[data-reference-selected-elements="admins"]')
    await expect(selected).toBeVisible()
    await expect(selected.getByRole('listitem').filter({ hasText: names[0] })).toBeVisible()
    await expect(selected.getByRole('listitem').filter({ hasText: names[1] })).toBeVisible()
  } finally {
    for (const id of adminIds) await db.admin.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('couriers resource universal plus opens and persists a courier', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const courierName = `Browser Couriers Plus ${nonce}`
  const email = `browser-couriers-plus-${nonce}@example.invalid`
  let courierId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="couriers"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const form = page.getByRole('dialog')
    await expect(form).toBeVisible()
    await form.locator('#admin-form-name').fill(courierName)
    await form.locator('#admin-form-email').fill(email)
    await form.locator('#admin-form-password').fill('browser-password-123')
    await expect(form.locator('#admin-form-role')).toHaveText(/Курьер|Courier/i)
    await form.getByRole('button', { name: /Создать|Create/i }).click()
    await expect.poll(async () => {
      const courier = await db.admin.findUnique({ where: { email }, select: { id: true, name: true, role: true } })
      courierId = courier?.id
      return courier?.role === 'COURIER' ? courier.name : undefined
    }).toBe(courierName)
  } finally {
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('couriers resource universal edit opens and persists the selected courier', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const courierName = `Browser Couriers Resource ${nonce}`
  const email = `browser-couriers-resource-${nonce}@example.invalid`
  let courierId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser couriers resource owner fixture is missing')
    const courier = await db.admin.create({ data: { name: courierName, email, password: 'browser-password-123', role: 'COURIER', createdBy: owner.id, isActive: true, transportType: 'CAR' } })
    courierId = courier.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="couriers"]').click()
    await page.getByRole('checkbox', { name: new RegExp(courierName) }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const form = page.getByRole('dialog')
    await expect(form.locator('#admin-form-name')).toHaveValue(courierName)
    const editedName = `${courierName} Edited`
    await form.locator('#admin-form-name').fill(editedName)
    await form.getByRole('button', { name: /Сохранить|Save|Saqlash/i }).click()
    await expect.poll(async () => (await db.admin.findUnique({ where: { id: courierId }, select: { name: true } }))?.name).toBe(editedName)
  } finally {
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal courier edit opens and persists the selected courier', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const courierName = `Browser Universal Courier ${nonce}`
  const email = `browser-universal-courier-${nonce}@example.invalid`
  let courierId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser universal courier Edit owner fixture is missing')
    const courier = await db.admin.create({ data: { name: courierName, email, password: 'browser-password-123', role: 'COURIER', createdBy: owner.id, isActive: true, transportType: 'CAR' } })
    courierId = courier.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="admins"]').click()
    await page.getByRole('checkbox', { name: `Select admin ${courierName}` }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const form = page.getByRole('dialog')
    await expect(form.locator('#admin-form-name')).toHaveValue(courierName)
    await form.locator('#admin-form-name').fill(`Browser Edited Courier ${nonce}`)
    await form.getByRole('button', { name: /Сохранить|Save/i }).click()
    await expect.poll(async () => (await db.admin.findUnique({ where: { id: courier.id }, select: { name: true } }))?.name).toBe(`Browser Edited Courier ${nonce}`)
  } finally {
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal admin edit opens and persists the selected low-admin', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const adminName = `Browser Universal Admin Edit ${nonce}`
  const email = `browser-universal-admin-edit-${nonce}@example.invalid`
  let adminId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser universal admin Edit owner fixture is missing')
    const admin = await db.admin.create({ data: { name: adminName, email, password: 'browser-password-123', role: 'LOW_ADMIN', createdBy: owner.id, isActive: true } })
    adminId = admin.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="admins"]').click()
    await page.getByRole('checkbox', { name: `Select admin ${adminName}` }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const form = page.getByRole('dialog')
    await expect(form.locator('#admin-form-name')).toHaveValue(adminName)
    await form.locator('#admin-form-name').fill(`Browser Edited Admin ${nonce}`)
    await form.getByRole('button', { name: /Сохранить|Save/i }).click()
    await expect.poll(async () => (await db.admin.findUnique({ where: { id: admin.id }, select: { name: true } }))?.name).toBe(`Browser Edited Admin ${nonce}`)
  } finally {
    if (adminId) await db.admin.delete({ where: { id: adminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal admin plus opens and persists a low-admin record', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const adminName = `Browser Universal Admin ${nonce}`
  const email = `browser-universal-admin-${nonce}@example.invalid`
  let adminId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="admins"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const form = page.getByRole('dialog')
    await expect(form).toBeVisible()
    await form.locator('#admin-form-name').fill(adminName)
    await form.locator('#admin-form-email').fill(email)
    await form.locator('#admin-form-password').fill('browser-password-123')
    await form.getByRole('button', { name: /Создать|Create/i }).click()
    await expect.poll(async () => {
      const admin = await db.admin.findUnique({ where: { email }, select: { id: true, name: true } })
      adminId = admin?.id
      return admin?.name
    }).toBe(adminName)
  } finally {
    if (adminId) await db.admin.delete({ where: { id: adminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal order edit opens and persists the selected order', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const orderNumber = 910000000 + (Date.now() % 1000000)
  let customerId: string | undefined
  let orderId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser universal order Edit owner fixture is missing')
    const customer = await db.customer.create({ data: { name: `Browser Universal Order Client ${nonce}`, phone: `+198${String(orderNumber).slice(-8)}`, address: 'Universal order address', createdBy: owner.id, autoOrdersEnabled: false } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, orderStatus: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'CASH', deliveryAddress: customer.address, deliveryDate: new Date(), deliveryTime: '10:00-12:00', quantity: 1, calories: 1600 } })
    orderId = order.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="orders"]').click()
    await page.getByRole('checkbox', { name: `Выбрать заказ ${orderNumber} / ${orderNumber}-buyurtmani tanlash` }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const addressInput = page.locator('input[placeholder="Google Maps link or coordinates (lat,lng)"]:visible')
    await expect(addressInput).toHaveValue('Universal order address')
    await addressInput.fill('Edited universal order address')
    const saveOrder = page.getByRole('dialog').getByRole('button', { name: /Сохранить|Saqlash/ }).last()
    await expect(saveOrder).toBeEnabled()
    await saveOrder.click()
    await expect.poll(async () => (await db.order.findUnique({ where: { id: order.id }, select: { deliveryAddress: true } }))?.deliveryAddress).toBe('Edited universal order address')
  } finally {
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal finance plus opens and persists a new virtual card', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const cardName = `Browser Universal Create Card ${nonce}`
  let cardId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="finance"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const nameInput = page.locator('input[aria-label="Название карты"]:visible, input[aria-label="Karta nomi"]:visible').first()
    await expect(nameInput).toBeVisible()
    await nameInput.fill(cardName)
    const saveCard = nameInput.locator('xpath=..').getByRole('button', { name: /Сохранить|Saqlash/ })
    await expect(saveCard).toBeEnabled()
    await saveCard.click()
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    await expect.poll(async () => {
      const card = owner ? await db.virtualCard.findFirst({ where: { ownerAdminId: owner.id, name: cardName }, select: { id: true, name: true } }) : null
      cardId = card?.id
      return card?.name
    }).toBe(cardName)
  } finally {
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal finance edit opens and persists the selected virtual card', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser finance Edit owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser Universal Card ${nonce}`, color: '#2563eb', balance: 2500 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="finance"]').click()
    const cardRow = page.locator('aside').filter({ hasText: `Browser Universal Card ${nonce}` }).getByRole('button').first()
    await expect(cardRow).toBeVisible()
    await cardRow.click()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const cardNameInput = page.locator('input[aria-label="Название карты"]:visible, input[aria-label="Karta nomi"]:visible').last()
    await expect(cardNameInput).toHaveValue(`Browser Universal Card ${nonce}`)
    await cardNameInput.fill(`Browser Edited Card ${nonce}`)
    const saveCard = cardNameInput.locator('xpath=..').getByRole('button', { name: /Сохранить|Saqlash/ })
    await expect(saveCard).toBeEnabled()
    await saveCard.click()
    await expect.poll(async () => (await db.virtualCard.findUnique({ where: { id: card.id }, select: { name: true } }))?.name).toBe(`Browser Edited Card ${nonce}`)
  } finally {
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal edit shows selected client elements before detail edit', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const names = [`Browser Selected Edit A ${nonce}`, `Browser Selected Edit B ${nonce}`]
  const customerIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser selected-elements owner fixture is missing')
    for (const [index, name] of names.entries()) {
      const customer = await db.customer.create({ data: {
        name,
        phone: `+179${index}${String(Date.now()).slice(-7)}`,
        address: 'Selected-elements browser address',
        createdBy: owner.id,
        calories: 1600,
        autoOrdersEnabled: false,
      }, select: { id: true } })
      customerIds.push(customer.id)
    }

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="clients"]').click()
    for (const name of names) await page.getByRole('checkbox', { name: `Select client ${name}` }).check()
    const universalEdit = page.locator('[data-reference-command="edit"]')
    await expect(universalEdit).toBeEnabled()
    await universalEdit.click()
    const selectedElements = page.locator('[data-reference-selected-elements="clients"]')
    await expect(selectedElements).toBeVisible()
    await expect(selectedElements.getByText('Выбранные элементы', { exact: true })).toBeVisible()
    for (const name of names) await expect(selectedElements.locator('button').filter({ hasText: name })).toBeVisible()
  } finally {
    if (customerIds.length > 0) await db.customer.deleteMany({ where: { id: { in: customerIds } } }).catch(() => undefined)
    await db.$disconnect()
  }
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

test('menu mutations return 404 for missing related records', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const payload = { menuNumber: 1, dishId: 'missing-dish-for-browser-test' }
  const updateResponse = await page.request.put('/api/admin/menus', { data: payload })
  const deleteResponse = await page.request.delete('/api/admin/menus', { data: payload })
  expect(updateResponse.status()).toBe(404)
  expect(deleteResponse.status()).toBe(404)
})

test('cooking plan rejects oversized dish maps', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const dishes = Object.fromEntries(Array.from({ length: 501 }, (_, index) => [`browser-dish-${index}`, 1]))
  const response = await page.request.post('/api/admin/warehouse/cooking-plan', {
    data: { date: new Date().toISOString(), menuNumber: 1, dishes },
  })
  expect(response.status()).toBe(400)
})

test('warehouse dish update returns 404 for missing records', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.put('/api/admin/warehouse/dishes', {
    data: {
      id: 'missing-dish-for-browser-test',
      name: 'Missing Dish Update',
      description: null,
      mealType: 'lunch',
      ingredients: [],
      menuNumbers: [],
    },
  })
  expect(response.status()).toBe(404)
})

test('warehouse dish deletion returns 404 for missing records', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const response = await page.request.delete('/api/admin/warehouse/dishes?id=missing-dish-for-browser-test')
  expect(response.status()).toBe(404)
})

test('warehouse inventory rejects oversized maps', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const inventory = Object.fromEntries(Array.from({ length: 501 }, (_, index) => [`browser-inventory-${index}`, 1]))
  const response = await page.request.post('/api/admin/warehouse/inventory', { data: inventory })
  expect(response.status()).toBe(400)
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

test('client registration exposes only RU and UZ user-facing copy', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('language', 'ru'))
  await page.goto('/sites/example-healthy-food/register')
  await expect(page.getByRole('heading', { name: 'Создайте доступ к кабинету', exact: true })).toBeVisible()
  await expect(page.getByLabel('Имя (необязательно)', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Номер телефона', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: 'Регистрация', exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Client registration|Create your portal access|Simple onboarding|Next step ready|Name \(optional\)|Phone Number|Already registered\?|Create account|Register|Login|Back to landing/i)
})

test('client login exposes only RU and UZ user-facing copy', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('language', 'ru'))
  await page.goto('/sites/example-healthy-food/login')
  await expect(page.getByRole('heading', { name: 'Вход по номеру телефона', exact: true })).toBeVisible()
  await expect(page.getByLabel('Номер телефона', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Client access|Login with your phone number|Phone-first login|Direct to dashboard|Phone Number|Quick secure access|Back to landing|New client\?|Create account|Login/i)
})

test('customer site supports phone login and portal hydration', async ({ page }) => {
  await page.goto('/sites/example-healthy-food/login')
  const phoneField = page.getByLabel(/Phone Number|Номер телефона|Telefon raqami/i)
  await expect(phoneField).toBeVisible()
  await phoneField.fill(process.env.E2E_CUSTOMER_PHONE || '+998901112233')
  await page.locator('form').getByRole('button', { name: /войти|kirish|login/i }).click()

  await expect(page).toHaveURL(/\/sites\/example-healthy-food\/client/)
  await expect(page.getByRole('heading', { name: /добро пожаловать|xush kelibsiz|welcome, browser test customer/i })).toBeVisible()
  await expect(page.getByText(/Today Menu|Меню на сегодня|Bugungi menyu/i)).toBeVisible()
  await expect(page.getByText(/Client Balance|Баланс клиента|Mijoz balansi/i)).toBeVisible()

  for (const englishLabel of ['Refresh', 'Logout', 'Balance', 'Active orders', 'Delivered', 'Completion rate', 'Plan mode', 'Last sync', 'Account snapshot', 'Profile', 'Google Maps Link', 'Calories target', 'Delivery consistency', 'Total orders tracked', 'Account snapshot', 'Current Order', 'History', 'Status:', 'Order:', 'Calories:', 'Time:', 'Date:', 'No active order right now.', 'Plan Status', 'Delivery days are not configured yet.', 'Updating plan status...', 'Today Menu', 'Day #', 'Set:', 'Menu is not available yet.', 'Paste a Google Maps link or coordinates to save your location.', 'Current address:', 'Active', 'Paused', 'Not configured', 'Not synced yet', 'Please login again.', 'Location saved', 'Plan activated', 'Plan deactivated', 'Client Balance', 'Balance, plan status, and current delivery information in one place.', "When inactive, future auto-orders will be paused and won't be delivered."]) {
    await expect(page.getByText(englishLabel, { exact: true })).toHaveCount(0)
  }
  await expect(page.locator('body')).not.toContainText(/Delivered:\s|Active:\s|Queue size:|Day #|Set:|Not synced yet|\bChat\b|\bMon\b|\bTue\b|\bWed\b|\bThu\b|\bFri\b|\bSat\b|\bSun\b|\bCalendar\b|\bToday\b|This week|This month|All time/i)

  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
  await page.locator('#mapsLink').fill('https://example.com/not-a-map')
  await page.getByRole('button', { name: /save location|сохранить местоположение|joylashuvni saqlash/i }).click()
  await expect(page.getByText(/Invalid Google Maps link or coordinates|Некорректная ссылка Google Maps|Google Maps havolasi noto'g'ri/i)).toBeVisible()
  await expect(page.getByText('Invalid Google Maps link or coordinates', { exact: true })).toHaveCount(0)

  await page.locator('#mapsLink').fill('https://maps.google.com/?q=41.311081,69.240562')
  await page.getByRole('button', { name: /save location|сохранить местоположение|joylashuvni saqlash/i }).click()
  await expect(page.getByText(/Location saved|Местоположение сохранено|Joylashuv saqlandi/i)).toBeVisible()
  await expect(page.getByText('Location saved', { exact: true })).toHaveCount(0)
})

test('client rail tracks the active page and splits orders from settings', async ({ page }) => {
  await page.goto('/sites/example-healthy-food/login')
  const phoneField = page.getByLabel(/Phone Number|Номер телефона|Telefon raqami/i)
  await expect(phoneField).toBeVisible()
  await phoneField.fill(process.env.E2E_CUSTOMER_PHONE || '+998901112233')
  await page.locator('form').getByRole('button', { name: /войти|kirish|login/i }).click()
  await expect(page).toHaveURL(/\/sites\/example-healthy-food\/client(?:\/|$)/)

  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Меню на сегодня')).toBeVisible()
  await expect(page.locator('[data-reference-page]:visible')).toHaveCount(2)

  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Статус плана')).toBeVisible()
  await expect(page.getByText('Профиль')).toBeVisible()
  await expect(page.getByText('Меню на сегодня')).toHaveCount(0)
  await expect(page.locator('[data-reference-page="orders"]')).not.toHaveAttribute('aria-current', 'page')

  await page.locator('[data-reference-page="orders"]').click()
  await expect(page.locator('[data-reference-page="orders"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Меню на сегодня')).toBeVisible()
  await expect(page.getByText('Профиль')).toHaveCount(0)
})

test('customer Uzbek shell stays localized after language persistence', async ({ page }) => {
  await page.goto('/sites/example-healthy-food/login')
  const phoneField = page.getByLabel(/Phone Number|Номер телефона|Telefon raqami/i)
  await phoneField.fill(process.env.E2E_CUSTOMER_PHONE || '+998901112233')
  await page.locator('form').getByRole('button', { name: /войти|kirish|login/i }).click()
  await expect(page).toHaveURL(/\/sites\/example-healthy-food\/client/)
  await page.evaluate(() => localStorage.setItem('language', 'uz'))
  await page.reload()
  await expect(page.getByText('Mijoz balansi', { exact: true })).toBeVisible()
  await expect(page.getByText('Faol buyurtmalar', { exact: true })).toBeVisible()
  await page.locator('[data-reference-page="settings"]').click()
  await expect(page.locator('[data-reference-page="settings"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Reja holati', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Client Balance|Active orders|Plan Status|Location saved|Invalid Google Maps link or coordinates/)
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

test('middle admin cannot update an out-of-scope database row', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `scope-${Date.now()}`
  const customer = await db.customer.create({
    data: { name: 'Browser Scope Fixture', phone, address: 'Tashkent', createdBy: null },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.put('/api/admin/database-row', {
      data: { tableId: 'customers', id: customer.id, data: { name: 'Should Not Update' } },
    })
    expect(response.status()).toBe(403)
  } finally {
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin cannot create admin rows', async ({ page }) => {
  const db = new PrismaClient()
  const email = `browser-escalation-${Date.now()}@example.com`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/database-row', {
      data: { tableId: 'admins', data: { email, name: 'Browser Escalation', role: 'LOW_ADMIN' } },
    })
    expect(response.status()).toBe(403)
  } finally {
    await db.admin.deleteMany({ where: { email } })
    await db.$disconnect()
  }
})

test('middle admin can use generic database writes', async ({ page }) => {
  const db = new PrismaClient()
  const name = `Browser Middle Database ${Date.now()}`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/database-row', {
      data: { tableId: 'warehouse', data: { name, amount: 1, unit: 'gr' } },
    })
    expect(response.status()).toBe(200)
  } finally {
    await db.warehouseItem.deleteMany({ where: { name } })
    await db.$disconnect()
  }
})

test('low admin is denied generic database writes', async ({ page }) => {
  const db = new PrismaClient()
  const name = `Browser Generic Write ${Date.now()}`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('low@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/low-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/database-row', {
      data: { tableId: 'warehouse', data: { name, amount: 1, unit: 'gr' } },
    })
    expect(response.status()).toBe(403)
  } finally {
    await db.warehouseItem.deleteMany({ where: { name } })
    await db.$disconnect()
  }
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

test('admin client creation rejects duplicate active phones', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+1999${Date.now().toString().slice(-10)}`
  const payload = {
    name: 'Browser Duplicate Client',
    phone,
    address: 'Tashkent',
    autoOrdersEnabled: false,
  }

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

    const first = await page.request.post('/api/admin/clients', { data: payload })
    expect(first.status()).toBe(200)

    const second = await page.request.post('/api/admin/clients', { data: payload })
    expect(second.status()).toBe(409)
  } finally {
    await db.customer.deleteMany({ where: { phone } })
    await db.$disconnect()
  }
})

test('middle admin can soft-delete an owned client', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const middleAdmin = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
  expect(middleAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: { name: 'Browser Soft Delete Client', phone, address: 'Tashkent', createdBy: middleAdmin!.id, isActive: false },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.delete(`/api/admin/clients/${customer.id}`)
    expect(response.status()).toBe(200)
    await expect.poll(async () => (await db.customer.findUnique({ where: { id: customer.id }, select: { deletedAt: true } }))?.deletedAt).not.toBeNull()
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin cannot permanently delete an out-of-scope client', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+998${String(Date.now()).slice(-9)}`
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: { name: 'Browser Protected Bin Client', phone, address: 'Tashkent', createdBy: superAdmin!.id, isActive: false, deletedAt: new Date(), deletedBy: superAdmin!.id },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.delete('/api/admin/clients/permanent-delete', { data: { clientIds: [customer.id] } })
    expect(response.status()).toBe(200)
    const data = await response.json() as { deletedClients?: number; deletedOrders?: number }
    expect(data.deletedClients).toBe(0)
    expect(data.deletedOrders).toBe(0)
    expect(await db.customer.findUnique({ where: { id: customer.id }, select: { id: true } })).not.toBeNull()
  } finally {
    await db.order.deleteMany({ where: { customerId: customer.id } })
    await db.customer.deleteMany({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('permanent client deletion rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.delete('/api/admin/clients/permanent-delete', {
    data: { clientIds: Array.from({ length: 501 }, (_, index) => `missing-client-${index}`) },
  })
  expect(response.status()).toBe(400)
})

test('bulk client deletion rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.delete('/api/admin/clients/delete', {
    data: { clientIds: Array.from({ length: 501 }, (_, index) => `missing-client-${index}`) },
  })
  expect(response.status()).toBe(400)
})

test('client restore rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/clients/restore', {
    data: { clientIds: Array.from({ length: 501 }, (_, index) => `missing-client-${index}`) },
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

test('middle admin cannot bulk-create admin rows', async ({ page }) => {
  const db = new PrismaClient()
  const email = `browser-bulk-escalation-${Date.now()}@example.com`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['email', 'name', 'role'],
      [email, 'Browser Bulk Escalation', 'LOW_ADMIN'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'admins')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const response = await page.request.post('/api/admin/database-import-xlsx', {
      multipart: {
        tableId: 'admins',
        file: {
          name: 'browser-bulk-escalation.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer,
        },
      },
    })

    expect(response.status()).toBe(403)
  } finally {
    await db.admin.deleteMany({ where: { email } })
    await db.$disconnect()
  }
})

test('middle admin cannot bulk-create cross-group orders', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `cross-group-${Date.now()}`
  const orderNumber = 700000000 + (Date.now() % 100000000)
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: { name: 'Browser Cross Group Customer', phone, address: 'Tashkent', createdBy: superAdmin!.id },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['orderNumber', 'customerId', 'deliveryAddress', 'orderStatus', 'paymentStatus', 'paymentMethod'],
      [orderNumber, customer.id, 'Tashkent', 'NEW', 'UNPAID', 'CASH'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'orders')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const response = await page.request.post('/api/admin/database-import-xlsx', {
      multipart: {
        tableId: 'orders',
        file: {
          name: 'browser-cross-group-order.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer,
        },
      },
    })

    expect(response.status()).toBe(200)
    const data = await response.json() as { created?: number; failed?: number }
    expect(data.created).toBe(0)
    expect(data.failed).toBe(1)
  } finally {
    await db.order.deleteMany({ where: { orderNumber } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin cannot all-sheets bulk-create cross-group orders', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `all-cross-group-${Date.now()}`
  const orderNumber = 710000000 + (Date.now() % 100000000)
  const superAdmin = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
  expect(superAdmin).not.toBeNull()
  const customer = await db.customer.create({
    data: { name: 'Browser All-Sheets Cross Group Customer', phone, address: 'Tashkent', createdBy: superAdmin!.id },
    select: { id: true },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['orderNumber', 'customerId', 'deliveryAddress', 'orderStatus', 'paymentStatus', 'paymentMethod'],
      [orderNumber, customer.id, 'Tashkent', 'NEW', 'UNPAID', 'CASH'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'orders')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const response = await page.request.post('/api/admin/database-import-xlsx-all', {
      multipart: {
        file: {
          name: 'browser-all-sheets-cross-group-order.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer,
        },
      },
    })

    expect(response.status()).toBe(200)
    const data = await response.json() as {
      created?: number
      failed?: number
      results?: Array<{ tableId?: string; created?: number; failed?: number }>
    }
    expect(data.created).toBe(0)
    expect(data.failed).toBe(1)
    expect(data.results?.find((result) => result.tableId === 'orders')).toMatchObject({ created: 0, failed: 1 })
  } finally {
    await db.order.deleteMany({ where: { orderNumber } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})

test('middle admin cannot bulk-create unscoped transactions', async ({ page }) => {
  const db = new PrismaClient()
  const description = `Browser Bulk Transaction ${Date.now()}`

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['amount', 'type', 'description'],
      [1, 'EXPENSE', description],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'transactions')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const response = await page.request.post('/api/admin/database-import-xlsx', {
      multipart: {
        tableId: 'transactions',
        file: {
          name: 'browser-bulk-transaction.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer,
        },
      },
    })

    expect(response.status()).toBe(403)
  } finally {
    await db.transaction.deleteMany({ where: { description } })
    await db.$disconnect()
  }
})

test('bulk order update rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.patch('/api/admin/orders/bulk-update', {
    data: {
      orderIds: Array.from({ length: 501 }, (_, index) => `missing-order-${index}`),
      updates: { paymentStatus: 'PAID' },
    },
  })
  expect(response.status()).toBe(400)
})

test('order restore rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.post('/api/admin/orders/restore', {
    data: { orderIds: Array.from({ length: 501 }, (_, index) => `missing-order-${index}`) },
  })
  expect(response.status()).toBe(400)
})

test('order soft deletion rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.delete('/api/admin/orders/delete', {
    data: { orderIds: Array.from({ length: 501 }, (_, index) => `missing-order-${index}`) },
  })
  expect(response.status()).toBe(400)
})

test('permanent order deletion rejects oversized batches', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

  const response = await page.request.delete('/api/admin/orders/permanent-delete', {
    data: { orderIds: Array.from({ length: 501 }, (_, index) => `missing-order-${index}`) },
  })
  expect(response.status()).toBe(400)
})

test('database import redacts row errors in production', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'test@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/super-admin(?:\/|$)/)

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['name', 'phone', 'address', 'createdBy'],
    ['Browser Import Error', `import-${Date.now()}`, 'Tashkent', 'missing-admin'],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'customers')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const response = await page.request.post('/api/admin/database-import-xlsx', {
    multipart: {
      tableId: 'customers',
      file: {
        name: 'browser-import-error.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      },
    },
  })

  expect(response.status()).toBe(200)
  const data = await response.json() as { failed?: number; errors?: Array<{ message?: string }> }
  expect(data.failed).toBe(1)
  expect(data.errors?.[0]?.message).toBe('Import failed')
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

test('resource workspace discloses order, client, and admin operational records', async ({ page }) => {
  const db = new PrismaClient()
  const middleAdmin = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
  if (!middleAdmin) throw new Error('Middle admin fixture is required')

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const orderNumber = 900000000 + (Date.now() % 1000000)
  const customer = await db.customer.create({
    data: {
      name: `Disclosure Client ${suffix}`,
      phone: `+1999${String(orderNumber).slice(-7)}`,
      address: 'Disclosure Test Address',
      createdBy: middleAdmin.id,
      autoOrdersEnabled: false,
    },
  })
  const courier = await db.admin.create({
    data: {
      name: `Disclosure Courier ${suffix}`,
      email: `disclosure-courier-${suffix}@example.invalid`,
      password: 'test-password',
      role: 'COURIER',
      createdBy: middleAdmin.id,
      transportType: 'CAR',
      vehicleNumber: '01A001AA',
    },
  })
  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      adminId: middleAdmin.id,
      courierId: courier.id,
      orderStatus: 'PENDING',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      deliveryAddress: customer.address,
      deliveryDate: new Date(),
      deliveryTime: '12:00-14:00',
      quantity: 1,
      calories: 1600,
    },
  })
  const customerTransaction = await db.transaction.create({
    data: {
      amount: 84000,
      type: 'INCOME',
      category: 'ORDER_PAYMENT',
      description: `Disclosure payment #${orderNumber}`,
      customerId: customer.id,
      adminId: middleAdmin.id,
    },
  })
  const adminTransaction = await db.transaction.create({
    data: {
      amount: 250000,
      type: 'INCOME',
      category: 'SALARY',
      description: `Disclosure courier ledger ${suffix}`,
      customerId: customer.id,
      adminId: courier.id,
    },
  })
  const orderEvent = await db.orderAuditEvent.create({
    data: {
      orderId: order.id,
      eventType: 'STATUS_CHANGED',
      actorAdminId: middleAdmin.id,
      actorName: 'Disclosure test operator',
      previousStatus: 'NEW',
      nextStatus: 'PENDING',
      message: 'Disclosure order status changed',
    },
  })
  const clientAction = await db.actionLog.create({
    data: {
      adminId: middleAdmin.id,
      action: 'DISCLOSURE_CLIENT_REVIEWED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      description: 'Disclosure client reviewed',
    },
  })
  const adminAction = await db.actionLog.create({
    data: {
      adminId: courier.id,
      action: 'DISCLOSURE_ADMIN_REVIEWED',
      entityType: 'ADMIN',
      entityId: courier.id,
      description: 'Disclosure admin reviewed',
    },
  })

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    await page.locator('[data-reference-page="clients"]').click()
    const clientButton = page.getByRole('button', { name: customer.name, exact: true })
    await expect(clientButton).toBeVisible()
    await clientButton.click()
    const clientSheet = page.getByRole('dialog').last()
    await expect(clientSheet).toContainText(/транзакции|transactions/i)
    await expect(clientSheet).toContainText(/контракт|delivery plan/i)
    await expect(clientSheet).toContainText(/связан.*заказ|related orders/i)
    await expect(clientSheet).toContainText(customerTransaction.description || '')
    await page.keyboard.press('Escape')

    await page.locator('[data-reference-page="finance"]').click()
    const financeRow = page.locator('tr').filter({ hasText: customerTransaction.description || '' }).first()
    await expect(financeRow).toBeVisible()
    await financeRow.click()
    const financeSheet = page.getByRole('dialog').last()
    await expect(financeSheet).toContainText(customer.name)
    await expect(financeSheet).toContainText(customerTransaction.description || '')
    await page.keyboard.press('Escape')

    await page.locator('[data-reference-page="orders"]').click()
    const orderButton = page.getByRole('button', { name: `View order ${orderNumber}`, exact: true })
    await expect(orderButton).toBeVisible()
    await orderButton.click()
    const orderDialog = page.getByRole('dialog').last()
    await expect(orderDialog).toContainText(/транзакции|transactions/i)
    await expect(orderDialog).toContainText(/контракт|contracts/i)
    await expect(orderDialog).toContainText(/действия|actions/i)
    await expect(orderDialog).toContainText(customerTransaction.description || '')
    await page.keyboard.press('Escape')

    await page.locator('[data-reference-page="admins"]').click()
    const adminButton = page.getByRole('button', { name: courier.name, exact: true })
    await expect(adminButton).toBeVisible()
    await adminButton.click()
    const adminSheet = page.getByRole('dialog').last()
    await expect(adminSheet).toContainText(/транзакции|transactions/i)
    await expect(adminSheet).toContainText(/контракт|employment/i)
    await expect(adminSheet).toContainText(/действия|actions/i)
    await expect(adminSheet).toContainText(/связан.*заказ|related orders/i)
    await expect(adminSheet).toContainText(adminTransaction.description || '')
    await expect(adminSheet).toContainText(adminAction.description || '')
  } finally {
    await db.actionLog.deleteMany({ where: { id: { in: [clientAction.id, adminAction.id] } } })
    await db.orderAuditEvent.delete({ where: { id: orderEvent.id } })
    await db.transaction.deleteMany({ where: { id: { in: [customerTransaction.id, adminTransaction.id] } } })
    await db.order.delete({ where: { id: order.id } })
    await db.admin.delete({ where: { id: courier.id } })
    await db.customer.delete({ where: { id: customer.id } })
    await db.$disconnect()
  }
})


test('calculator draft trash and restore use the shared universal lifecycle', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let purchaseId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const draftTitle = `Browser calculator trash draft ${nonce}`
    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: draftTitle, items: [{ name: `Browser trash ingredient ${nonce}`, amount: 2, unit: 'kg', costPerUnit: 100 }], idempotencyKey: `browser-calculator-trash-${nonce}` },
    })
    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    purchaseId = created.purchase?.id
    expect(purchaseId).toEqual(expect.any(String))

    await page.locator('[data-reference-page="calculator"]').click()
    const purchaseRow = page.locator('aside[aria-label="История покупок"] button').filter({ hasText: draftTitle }).first()
    await expect(purchaseRow).toBeVisible()
    await purchaseRow.click()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    const trashResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/finance/purchases' && response.request().method() === 'DELETE' && response.ok())
    await Promise.all([trashResponse, page.getByRole('button', { name: 'Подтвердить', exact: true }).click()])
    const trashed = await db.purchase.findUnique({ where: { id: purchaseId }, select: { deletedAt: true } })
    expect(trashed?.deletedAt).not.toBeNull()

    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    await expect(page.locator('aside[aria-label="История покупок"]')).toContainText(draftTitle)
    const restoreResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/finance/purchases' && response.request().method() === 'PATCH' && response.ok())
    await Promise.all([restoreResponse, page.locator('[data-reference-command="create"]').click()])
    const restored = await db.purchase.findUnique({ where: { id: purchaseId }, select: { deletedAt: true } })
    expect(restored?.deletedAt).toBeNull()
  } finally {
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})


test('completed calculator purchases remain immutable in the browser session', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  let transactionId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser immutable card ${nonce}`, color: '#059669', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser immutable purchase ${nonce}`, items: [{ name: `Browser immutable ingredient ${nonce}`, amount: 1, unit: 'kg', costPerUnit: 100 }], idempotencyKey: `browser-immutable-${nonce}` },
    })
    expect(createResponse.status()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    if (!purchaseId) throw new Error('Created purchase id is missing')
    const completeResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(completeResponse.status()).toBe(200)
    const completed = await completeResponse.json()
    transactionId = completed.purchase?.transactionId
    expect(completed.purchase?.status).toBe('COMPLETED')

    const editResponse = await page.request.patch('/api/admin/finance/purchases', { data: { id: purchaseId, title: `Tampered immutable purchase ${nonce}` } })
    expect(editResponse.status()).toBe(409)
    const deleteResponse = await page.request.delete(`/api/admin/finance/purchases?id=${encodeURIComponent(purchaseId)}`)
    expect(deleteResponse.status()).toBe(409)
    const persisted = await db.purchase.findUnique({ where: { id: purchaseId }, select: { status: true, deletedAt: true, title: true } })
    expect(persisted).toMatchObject({ status: 'COMPLETED', deletedAt: null, title: `Browser immutable purchase ${nonce}` })
  } finally {
    if (transactionId) await db.transaction.delete({ where: { id: transactionId } }).catch(() => undefined)
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})


test('calculator Finish mutates inventory and card balance once on retry', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser one-time inventory ${nonce}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  let transactionId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser one-time card ${nonce}`, color: '#059669', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser one-time purchase ${nonce}`, items: [{ name: ingredientName, amount: 3, unit: 'kg', costPerUnit: 100 }], idempotencyKey: `browser-one-time-${nonce}` },
    })
    expect(createResponse.status()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    if (!purchaseId) throw new Error('Created purchase id is missing')

    const firstFinish = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(firstFinish.status()).toBe(200)
    const firstResult = await firstFinish.json()
    transactionId = firstResult.purchase?.transactionId
    expect(firstResult.purchase?.status).toBe('COMPLETED')
    const secondFinish = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(secondFinish.status()).toBe(200)
    const secondResult = await secondFinish.json()
    expect(secondResult.purchase?.transactionId).toBe(transactionId)

    const [inventory, persistedCard, transactions] = await Promise.all([
      db.warehouseItem.findUnique({ where: { name: ingredientName }, select: { amount: true, unit: true } }),
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true } }),
      db.transaction.count({ where: { virtualCardId: card.id, description: { contains: `Browser one-time purchase ${nonce}` } } }),
    ])
    expect(inventory).toMatchObject({ amount: 3, unit: 'kg' })
    expect(persistedCard?.balance).toBe(99700)
    expect(transactions).toBe(1)
  } finally {
    if (transactionId) await db.transaction.delete({ where: { id: transactionId } }).catch(() => undefined)
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    await db.warehouseItem.delete({ where: { name: ingredientName } }).catch(() => undefined)
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('legacy ingredient purchase endpoint shares canonical completion history', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser legacy adapter ingredient ${nonce}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  let transactionId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser legacy adapter card ${nonce}`, color: '#7c3aed', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const payload = { title: `Browser legacy adapter purchase ${nonce}`, virtualCardId: card.id, idempotencyKey: `browser-legacy-adapter-${nonce}`, items: [{ name: ingredientName, amount: 2, unit: 'kg', costPerUnit: 150, kcalPerGram: 2 }] }
    const firstResponse = await page.request.post('/api/admin/finance/buy-ingredients', { data: payload })
    expect(firstResponse.status()).toBe(200)
    const first = await firstResponse.json()
    purchaseId = first.purchase?.id
    transactionId = first.transaction?.id
    expect(first.purchase?.status).toBe('COMPLETED')
    expect(purchaseId).toEqual(expect.any(String))
    expect(transactionId).toEqual(expect.any(String))
    if (!purchaseId || !transactionId) throw new Error('Legacy purchase response ids are missing')

    const retryResponse = await page.request.post('/api/admin/finance/buy-ingredients', { data: payload })
    expect(retryResponse.status()).toBe(200)
    const retry = await retryResponse.json()
    expect(retry.purchase?.id).toBe(purchaseId)
    expect(retry.transaction?.id).toBe(transactionId)

    const [inventory, persistedCard, actionLogs, transactions] = await Promise.all([
      db.warehouseItem.findUnique({ where: { name: ingredientName }, select: { amount: true, unit: true, kcalPerGram: true } }),
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true } }),
      db.actionLog.findMany({ where: { entityId: purchaseId }, select: { action: true, entityType: true } }),
      db.transaction.count({ where: { id: transactionId } }),
    ])
    expect(inventory).toMatchObject({ amount: 2, unit: 'kg', kcalPerGram: 2 })
    expect(persistedCard?.balance).toBe(99700)
    expect(transactions).toBe(1)
    expect(actionLogs).toEqual([{ action: 'COMPLETE_PURCHASE', entityType: 'PURCHASE' }])
  } finally {
    if (transactionId) await db.transaction.delete({ where: { id: transactionId } }).catch(() => undefined)
    if (purchaseId) {
      await db.actionLog.deleteMany({ where: { entityId: purchaseId } }).catch(() => undefined)
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    await db.warehouseItem.delete({ where: { name: ingredientName } }).catch(() => undefined)
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('disabled virtual cards cannot complete a purchase or cause partial effects', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser disabled card ingredient ${nonce}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser disabled card ${nonce}`, color: '#dc2626', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser disabled card purchase ${nonce}`, items: [{ name: ingredientName, amount: 1, unit: 'kg', costPerUnit: 250 }], idempotencyKey: `browser-disabled-card-${nonce}` },
    })
    expect(createResponse.status()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    if (!purchaseId) throw new Error('Created purchase id is missing')

    const disableResponse = await page.request.patch('/api/admin/finance/cards', { data: { id: card.id, isActive: false } })
    expect(disableResponse.status()).toBe(200)
    const finishResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(finishResponse.status()).toBe(400)

    const [purchase, persistedCard, inventory, transactions] = await Promise.all([
      db.purchase.findUnique({ where: { id: purchaseId }, select: { status: true, transactionId: true, deletedAt: true } }),
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true, isActive: true, deletedAt: true } }),
      db.warehouseItem.findUnique({ where: { name: ingredientName }, select: { amount: true } }),
      db.transaction.count({ where: { virtualCardId: card.id } }),
    ])
    expect(purchase).toMatchObject({ status: 'DRAFT', transactionId: null, deletedAt: null })
    expect(persistedCard).toMatchObject({ balance: 100000, isActive: false, deletedAt: null })
    expect(inventory).toBeNull()
    expect(transactions).toBe(0)
  } finally {
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.warehouseItem.delete({ where: { name: ingredientName } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('insufficient virtual-card balance leaves calculator purchase fully unchanged', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const ingredientName = `Browser insufficient balance ingredient ${nonce}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser insufficient balance card ${nonce}`, color: '#dc2626', balance: 50 } })
    cardId = card.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="calculator"]').click()
    await expect(page.locator('main').getByText(/AI-закупка|AI xarid/i).first()).toBeVisible()
    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser insufficient balance purchase ${nonce}`, items: [{ name: ingredientName, amount: 1, unit: 'kg', costPerUnit: 100 }], idempotencyKey: `browser-insufficient-balance-${nonce}` },
    })
    expect(createResponse.status(), await createResponse.text()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))
    if (!purchaseId) throw new Error('Created purchase id is missing')
    const finishResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id } })
    expect(finishResponse.status(), await finishResponse.text()).toBe(400)
    const [purchase, persistedCard, inventory, transactions] = await Promise.all([
      db.purchase.findUnique({ where: { id: purchaseId }, select: { status: true, transactionId: true, totalCost: true, deletedAt: true } }),
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true, isActive: true, deletedAt: true } }),
      db.warehouseItem.findUnique({ where: { name: ingredientName }, select: { amount: true } }),
      db.transaction.count({ where: { virtualCardId: card.id, description: { contains: `Browser insufficient balance purchase ${nonce}` } } }),
    ])
    expect(purchase).toMatchObject({ status: 'DRAFT', transactionId: null, totalCost: 100, deletedAt: null })
    expect(persistedCard).toMatchObject({ balance: 50, isActive: true, deletedAt: null })
    expect(inventory).toBeNull()
    expect(transactions).toBe(0)
  } finally {
    if (purchaseId) {
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    if (cardId) await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.warehouseItem.delete({ where: { name: ingredientName } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('manual finance transactions reject cross-scope virtual cards', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'test@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser scope card ${nonce}`, color: '#2563eb', balance: 500 } })
    cardId = card.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/finance/transaction', {
      data: { amount: 100, type: 'EXPENSE', category: 'MANUAL_ADJUSTMENT', virtualCardId: card.id, description: `Browser cross scope ${nonce}` },
    })
    expect(response.status()).toBe(404)
    const [persistedCard, transactions] = await Promise.all([
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true } }),
      db.transaction.count({ where: { virtualCardId: card.id, description: `Browser cross scope ${nonce}` } }),
    ])
    expect(persistedCard?.balance).toBe(500)
    expect(transactions).toBe(0)
  } finally {
    if (cardId) {
      await db.transaction.deleteMany({ where: { virtualCardId: cardId } }).catch(() => undefined)
      await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('contract creation persists courier period metadata and internal assignment notice', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let customerId: string | undefined
  let contractId: string | undefined
  let courierId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser contract owner fixture is missing')
    const courier = await db.admin.create({ data: { email: `browser-courier-${nonce}@example.test`, name: `Browser contract courier ${nonce}`, role: 'COURIER', createdBy: owner.id, phone: `+1777${String(Date.now()).slice(-7)}` }, select: { id: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser contract customer ${nonce}`, phone: `+1555${String(Date.now()).slice(-7)}`, address: 'Browser Contract Address', createdBy: owner.id, isActive: true, autoOrdersEnabled: false } })
    customerId = customer.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/contracts', {
      data: {
        customerId: customer.id,
        courierId,
        autoRenew: true,
        status: 'ENABLED',
        paid: false,
        period: { startDate: '2026-09-01', endDate: '2026-09-07', courierId, color: '#2563eb', status: 'ENABLED', paid: false, autoRenew: true, enabledWeekdays: ['MONDAY', 'WEDNESDAY'], disabledDates: ['2026-09-03'] },
      },
    })
    expect(response.status()).toBe(201)
    const result = await response.json()
    contractId = result.contract?.id
    expect(contractId).toEqual(expect.any(String))
    if (!contractId) throw new Error('Created contract id is missing')

    const [period, audit, notice] = await Promise.all([
      db.contractPeriod.findFirst({ where: { contractId }, select: { courierId: true, startDate: true, endDate: true, color: true, status: true, autoRenew: true, enabledWeekdays: true, disabledDates: true } }),
      db.actionLog.findFirst({ where: { entityType: 'CONTRACT', entityId: contractId, action: 'CREATE_CONTRACT' }, select: { entityId: true, action: true } }),
      db.message.findFirst({ where: { senderId: owner.id, content: { contains: contractId } }, select: { content: true } }),
    ])
    expect(period).toMatchObject({ courierId, color: '#2563eb', status: 'ENABLED', autoRenew: true, enabledWeekdays: ['MONDAY', 'WEDNESDAY'], disabledDates: ['2026-09-03'] })
    expect(period?.startDate).toEqual(new Date('2026-09-01T00:00:00.000Z'))
    expect(period?.endDate).toEqual(new Date('2026-09-07T00:00:00.000Z'))
    expect(audit).toEqual({ entityId: contractId, action: 'CREATE_CONTRACT' })
    expect(notice?.content).toContain(contractId)

    const disabledResponse = await page.request.patch(`/api/admin/contracts/${contractId}`, { data: { status: 'DISABLED' } })
    expect(disabledResponse.status()).toBe(200)
    const disabledContract = await page.request.get(`/api/admin/contracts/${contractId}`)
    expect(disabledContract.status()).toBe(200)
    const disabledBody = await disabledContract.json()
    expect(disabledBody.contract.status).toBe('DISABLED')
    expect(disabledBody.contract.periods).toHaveLength(1)
    expect(disabledBody.contract.periods[0].status).toBe('ENABLED')

    const enabledResponse = await page.request.patch(`/api/admin/contracts/${contractId}`, { data: { status: 'ENABLED' } })
    expect(enabledResponse.status()).toBe(200)
    const enabledBody = await enabledResponse.json()
    expect(enabledBody.contract.status).toBe('ENABLED')
    expect(enabledBody.contract.periods).toHaveLength(1)
  } finally {
    if (contractId) {
      await db.message.deleteMany({ where: { content: { contains: contractId } } }).catch(() => undefined)
      await db.actionLog.deleteMany({ where: { entityId: contractId } }).catch(() => undefined)
      await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    }
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('contract periods expose scoped calendar overrides without losing their graph', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = '2026-09-03'
  let customerId: string | undefined
  let contractId: string | undefined
  let periodId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser period calendar owner fixture is missing')
    const customer = await db.customer.create({ data: { name: `Browser period calendar customer ${nonce}`, phone: `+1556${String(Date.now()).slice(-7)}`, address: 'Browser Period Address', createdBy: owner.id, isActive: true, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', paid: false, autoRenew: false } })
    contractId = contract.id
    const period = await db.contractPeriod.create({ data: { contractId: contract.id, startDate: new Date('2026-09-01T00:00:00.000Z'), endDate: new Date('2026-09-07T00:00:00.000Z'), status: 'ENABLED', paid: false, autoRenew: false, enabledWeekdays: ['MONDAY'], disabledDates: [] } })
    periodId = period.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const write = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'CONTRACT_PERIOD', resourceId: period.id, date, state: 'DISABLED', reason: `browser period ${nonce}` } })
    expect(write.status()).toBe(200)
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=CONTRACT_PERIOD&resourceId=${period.id}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    expect((await read.json()).overrides[0]).toMatchObject({ resourceType: 'CONTRACT_PERIOD', resourceId: period.id, date, state: 'DISABLED' })
    expect(await db.contractPeriod.count({ where: { contractId: contract.id } })).toBe(1)
    const remove = await page.request.delete(`/api/admin/resource-availability?resourceType=CONTRACT_PERIOD&resourceId=${period.id}&date=${date}`)
    expect(remove.status()).toBe(200)
    expect((await (await page.request.get(`/api/admin/resource-availability?resourceType=CONTRACT_PERIOD&resourceId=${period.id}&from=${date}&to=${date}`)).json()).overrides).toHaveLength(0)
  } finally {
    if (periodId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'CONTRACT_PERIOD', resourceId: periodId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('Cooking draft save preserves stock until explicit cook action', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser cooking draft stock ${nonce}`
  const target = new Date(Date.now() + 3 * 86_400_000)
  target.setUTCHours(0, 0, 0, 0)
  const date = target.toISOString().slice(0, 10)
  let itemId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser cooking owner fixture is missing')
    const item = await db.warehouseItem.create({ data: { name: ingredientName, amount: 10, unit: 'kg', kcalPerGram: 1, pricePerUnit: 100, priceUnit: 'kg' } })
    itemId = item.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const save = await page.request.post('/api/admin/warehouse/cooking-plan', {
      data: { date: `${date}T00:00:00.000Z`, menuNumber: 1, color: '#2563eb', dishes: {}, consumption: [{ dishId: 'draft-only-dish', calorie: 1600, amount: 1, ingredients: [{ name: ingredientName, amount: 2, unit: 'kg' }], provenance: { setId: null, groupCalories: null } }] },
    })
    expect(save.status()).toBe(200)
    const persisted = await db.warehouseItem.findUnique({ where: { id: itemId }, select: { amount: true } })
    expect(persisted?.amount).toBe(10)

    const loaded = await page.request.get(`/api/admin/warehouse/cooking-plan?date=${date}`)
    expect(loaded.status()).toBe(200)
    const loadedBody = await loaded.json()
    expect(loadedBody.consumption?.[0]?.ingredients?.[0]).toMatchObject({ name: ingredientName, amount: 2, unit: 'kg' })
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date: new Date(`${date}T00:00:00.000Z`) } }).catch(() => undefined)
    if (itemId) await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('Cooking day lifecycle disable and restore stays readable', async ({ page }) => {
  const db = new PrismaClient()
  const target = new Date(Date.now() + 4 * 86_400_000)
  target.setUTCHours(0, 0, 0, 0)
  const date = target.toISOString().slice(0, 10)
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const save = await page.request.post('/api/admin/warehouse/cooking-plan', { data: { date: `${date}T00:00:00.000Z`, menuNumber: 1, dishes: {}, consumption: [] } })
    expect(save.status()).toBe(200)
    const disable = await page.request.patch('/api/admin/warehouse/cooking-plan', { data: { date, isActive: false } })
    expect(disable.status()).toBe(200)
    const disabled = await db.dailyCookingPlan.findFirst({ where: { date: new Date(`${date}T00:00:00.000Z`) }, select: { isActive: true, deletedAt: true } })
    expect(disabled).toMatchObject({ isActive: false, deletedAt: null })
    const resave = await page.request.post('/api/admin/warehouse/cooking-plan', { data: { date: `${date}T00:00:00.000Z`, menuNumber: 1, dishes: {}, consumption: [] } })
    expect(resave.status()).toBe(200)
    const stillDisabled = await db.dailyCookingPlan.findFirst({ where: { date: new Date(`${date}T00:00:00.000Z`) }, select: { isActive: true } })
    expect(stillDisabled?.isActive).toBe(false)
    const readable = await page.request.get(`/api/admin/warehouse/cooking-plan?date=${date}`)
    expect(readable.status()).toBe(200)
    expect((await readable.json()).isActive).toBe(false)

    const enable = await page.request.patch('/api/admin/warehouse/cooking-plan', { data: { date, isActive: true } })
    expect(enable.status()).toBe(200)
    const restored = await db.dailyCookingPlan.findFirst({ where: { date: new Date(`${date}T00:00:00.000Z`) }, select: { isActive: true, deletedAt: true } })
    expect(restored).toMatchObject({ isActive: true, deletedAt: null })
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date: new Date(`${date}T00:00:00.000Z`) } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('manual transaction lifecycle disable and restore stays readable', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let transactionId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser transaction owner fixture is missing')
    const transaction = await db.transaction.create({ data: { adminId: owner.id, amount: 5, type: 'INCOME', category: 'MANUAL_ADJUSTMENT', description: `Browser transaction lifecycle ${nonce}` } })
    transactionId = transaction.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const disable = await page.request.patch('/api/admin/finance/company', { data: { id: transaction.id, isActive: false } })
    expect(disable.status()).toBe(200)
    const disabled = await db.transaction.findUnique({ where: { id: transaction.id }, select: { isActive: true, deletedAt: true } })
    expect(disabled).toMatchObject({ isActive: false, deletedAt: null })
    const readable = await page.request.get(`/api/admin/finance/company?search=${encodeURIComponent(nonce)}`)
    expect(readable.status()).toBe(200)
    expect((await readable.json()).history?.[0]?.isActive).toBe(false)

    const enable = await page.request.patch('/api/admin/finance/company', { data: { id: transaction.id, isActive: true } })
    expect(enable.status()).toBe(200)
    const restored = await db.transaction.findUnique({ where: { id: transaction.id }, select: { isActive: true, deletedAt: true } })
    expect(restored).toMatchObject({ isActive: true, deletedAt: null })
  } finally {
    if (transactionId) await db.transaction.delete({ where: { id: transactionId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('Calculator AI unsupported language falls back to Russian labels', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.evaluate(() => localStorage.setItem('language', 'en'))
  await page.reload()
  await page.locator('[data-reference-page="calculator"]').click()
  await expect(page.getByText('AI-закупка', { exact: true })).toBeVisible()
  await expect(page.getByText('Требует подтверждения', { exact: true })).toBeVisible()
  await expect(page.getByText('AI purchase', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Requires confirmation', { exact: true })).toHaveCount(0)
})

test('calculator hydrates bounded ingredient availability overrides', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let itemId: string | undefined
  const date = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser calculator availability owner fixture is missing')
    const item = await db.warehouseItem.create({ data: { name: `Browser calculator availability ${nonce}`, amount: 1, unit: 'kg', pricePerUnit: 100, priceUnit: 'kg', isActive: true } })
    itemId = item.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const disable = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'INGREDIENT', resourceId: item.id, date, state: 'DISABLED', reason: `browser calculator availability ${nonce}` } })
    expect(disable.status()).toBe(200)
    const seenAvailabilityRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('resourceType=INGREDIENT')) seenAvailabilityRequests.push(request.url())
    })
    await page.locator('[data-reference-page="calculator"]').click()
    await expect.poll(() => seenAvailabilityRequests.length).toBeGreaterThan(0)
    expect(seenAvailabilityRequests.some((url) => url.includes('from=') && url.includes('to='))).toBe(true)
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=INGREDIENT&resourceId=${item.id}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    expect((await read.json()).overrides).toEqual(expect.arrayContaining([expect.objectContaining({ resourceId: item.id, date, state: 'DISABLED' })]))
  } finally {
    if (itemId) {
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'INGREDIENT', resourceId: itemId } }).catch(() => undefined)
      await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('calculator hydrates bounded dish availability overrides', async ({ page }) => {
  const db = new PrismaClient()
  const date = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10)
  let dishId: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const dishesResponse = await page.request.get('/api/admin/warehouse/dishes')
    expect(dishesResponse.status()).toBe(200)
    const dishes = await dishesResponse.json()
    const dish = Array.isArray(dishes) ? dishes.find((candidate: { id?: unknown }) => typeof candidate.id === 'number' || typeof candidate.id === 'string') : null
    expect(dish).not.toBeNull()
    dishId = String(dish.id)
    const disable = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'DISH', resourceId: dishId, date, state: 'DISABLED', reason: `browser calculator dish availability ${date}` } })
    expect(disable.status()).toBe(200)
    const seenAvailabilityRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('resourceType=DISH')) seenAvailabilityRequests.push(request.url())
    })
    await page.locator('[data-reference-page="calculator"]').click()
    await expect.poll(() => seenAvailabilityRequests.length).toBeGreaterThan(0)
    expect(seenAvailabilityRequests.some((url) => url.includes('from=') && url.includes('to='))).toBe(true)
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=DISH&resourceId=${dishId}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    expect((await read.json()).overrides).toEqual(expect.arrayContaining([expect.objectContaining({ resourceId: dishId, date, state: 'DISABLED' })]))
  } finally {
    if (dishId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'DISH', resourceId: dishId, date: new Date(`${date}T00:00:00.000Z`) } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('resource calendar override disables and restores a scoped virtual card day', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  let cardId: string | undefined
  const date = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser calendar owner fixture is missing')
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser calendar card ${nonce}`, color: '#2563eb', balance: 500 } })
    cardId = card.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const write = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'VIRTUAL_CARD', resourceId: card.id, date, state: 'DISABLED', reason: `browser calendar ${nonce}` } })
    expect(write.status()).toBe(200)
    expect(await db.actionLog.findFirst({ where: { entityType: 'RESOURCE_AVAILABILITY', entityId: card.id, action: 'DISABLE_RESOURCE_DATE' }, select: { adminId: true, action: true, entityId: true, details: true } })).toMatchObject({ adminId: owner.id, action: 'DISABLE_RESOURCE_DATE', entityId: card.id })
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${card.id}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    const body = await read.json()
    expect(body.overrides).toHaveLength(1)
    expect(body.overrides[0]).toMatchObject({ resourceType: 'VIRTUAL_CARD', resourceId: card.id, date, state: 'DISABLED', reason: `browser calendar ${nonce}` })

    const restore = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'VIRTUAL_CARD', resourceId: card.id, date, state: 'ENABLED', reason: `browser calendar restore ${nonce}` } })
    expect(restore.status()).toBe(200)
    expect((await (await page.request.get(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${card.id}&from=${date}&to=${date}`)).json()).overrides[0].state).toBe('ENABLED')
    const remove = await page.request.delete(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${card.id}&date=${date}`)
    expect(remove.status()).toBe(200)
    expect(await db.actionLog.findFirst({ where: { entityType: 'RESOURCE_AVAILABILITY', entityId: card.id, action: 'DELETE_RESOURCE_DATE' }, select: { adminId: true, action: true, entityId: true, details: true } })).toMatchObject({ adminId: owner.id, action: 'DELETE_RESOURCE_DATE', entityId: card.id })
    expect((await (await page.request.get(`/api/admin/resource-availability?resourceType=VIRTUAL_CARD&resourceId=${card.id}&from=${date}&to=${date}`)).json()).overrides).toHaveLength(0)
  } finally {
    if (cardId) {
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'VIRTUAL_CARD', resourceId: cardId } }).catch(() => undefined)
      await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('AI price influence is explicit, normalized, and auditable', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const enabledName = `Browser Price Match ${nonce}`
  const disabledName = `Browser Price Disabled ${nonce}`
  let enabledId: string | undefined
  let disabledId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser price owner fixture is missing')
    const enabled = await db.warehouseItem.create({ data: { name: enabledName, amount: 1, unit: 'kg', pricePerUnit: 100, priceUnit: 'kg', isActive: true } })
    const disabled = await db.warehouseItem.create({ data: { name: disabledName, amount: 1, unit: 'kg', pricePerUnit: 200, priceUnit: 'kg', isActive: true } })
    enabledId = enabled.id
    disabledId = disabled.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/finance/purchases/price-influence', { data: { items: [{ name: enabledName.toLowerCase(), unit: 'kg', costPerUnit: 175, enabled: true }, { name: disabledName, unit: 'kg', costPerUnit: 999, enabled: false }] } })
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ updated: 1, skipped: 1, rejected: [] })
    expect(await db.warehouseItem.findUnique({ where: { id: enabled.id }, select: { pricePerUnit: true } })).toMatchObject({ pricePerUnit: 175 })
    expect(await db.warehouseItem.findUnique({ where: { id: disabled.id }, select: { pricePerUnit: true } })).toMatchObject({ pricePerUnit: 200 })
    expect(await db.actionLog.findFirst({ where: { action: 'AI_PRICE_INFLUENCE', entityType: 'INGREDIENT', entityId: enabled.id }, select: { adminId: true, action: true, entityId: true } })).toMatchObject({ adminId: owner.id, action: 'AI_PRICE_INFLUENCE', entityId: enabled.id })
  } finally {
    if (enabledId) {
      await db.actionLog.deleteMany({ where: { entityId: enabledId, action: 'AI_PRICE_INFLUENCE' } }).catch(() => undefined)
      await db.warehouseItem.delete({ where: { id: enabledId } }).catch(() => undefined)
    }
    if (disabledId) await db.warehouseItem.delete({ where: { id: disabledId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('AI purchase assistant is truthful and mutation-free before confirmation', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser AI ingredient ${nonce}`
  let itemId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser AI owner fixture is missing')
    const item = await db.warehouseItem.create({ data: { name: ingredientName, amount: 10, unit: 'kg', pricePerUnit: 100, priceUnit: 'kg', isActive: true } })
    itemId = item.id
    const beforePurchases = await db.purchase.count({ where: { ownerAdminId: owner.id, title: { contains: nonce } } })

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/finance/purchases/assist', { data: { text: `Buy ${ingredientName}` } })
    expect([200, 503]).toContain(response.status())
    const body = await response.json()
    if (response.status() === 200) {
      expect(body.requiresConfirmation).toBe(true)
      expect(body.items).toEqual(expect.any(Array))
    } else {
      expect(body.error).toMatch(/AI provider|supported AI purchase model/i)
    }
    expect(await db.purchase.count({ where: { ownerAdminId: owner.id, title: { contains: nonce } } })).toBe(beforePurchases)
    expect((await db.warehouseItem.findUnique({ where: { id: item.id }, select: { amount: true } }))?.amount).toBe(10)
  } finally {
    if (itemId) await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal contracts plus opens and persists a contract period', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const customerName = `Browser Universal Contract ${nonce}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const customer = await db.customer.create({
      data: {
        name: customerName,
        phone: `+1779${String(Date.now()).slice(-7)}`,
        address: 'Universal contract browser address',
        createdBy: owner.id,
        isActive: true,
        autoOrdersEnabled: false,
      },
      select: { id: true },
    })
    customerId = customer.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="contracts"]').click()
    await page.locator('[data-reference-command="create"]').click()

    const customerSelect = page.locator('main select').first()
    await expect(customerSelect).toBeVisible()
    await customerSelect.selectOption({ label: customerName })
    await page.locator('main').getByRole('button', { name: /сохранить|saqlash|save/i }).last().click()

    await expect.poll(async () => {
      const contract = await db.contract.findFirst({ where: { customerId }, include: { periods: true } })
      if (!contract) return false
      contractId = contract.id
      return contract.periods.length > 0
    }).toBe(true)
  } finally {
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal contracts edit opens the selected contract and persists a period change', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const customerName = `Browser Universal Contract Edit ${nonce}`
  let customerId: string | undefined
  let contractId: string | undefined
  let courierId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    const customer = await db.customer.create({
      data: {
        name: customerName,
        phone: `+1780${String(Date.now()).slice(-7)}`,
        address: 'Universal contract edit browser address',
        createdBy: owner.id,
        isActive: true,
        autoOrdersEnabled: false,
      },
      select: { id: true },
    })
    customerId = customer.id
    const courier = await db.admin.create({ data: { email: `browser-contract-courier-${nonce}@example.com`, name: `Browser Contract Courier ${nonce}`, role: 'COURIER', createdBy: owner.id, isActive: true } })
    courierId = courier.id
    const contract = await db.contract.create({
      data: {
        customerId: customer.id,
        ownerAdminId: owner.id,
        status: 'ENABLED',
        periods: {
          create: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 86_400_000),
            status: 'ENABLED',
            paid: false,
            enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            disabledDates: [],
          },
        },
      },
      select: { id: true },
    })
    contractId = contract.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="contracts"]').click()
    await expect(page.getByText(customerName)).toBeVisible()
    const contractRow = page.locator(`[data-reference-resource-row="contracts"][data-resource-id="${contractId}"]`)
    await contractRow.locator('input[type="checkbox"]').check()
    await page.locator('[data-reference-command="edit"]').click()

    const courierAssignmentResponse = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/admin/contracts/${contractId}` && response.request().method() === 'PATCH' && response.ok())
    await contractRow.getByRole('combobox').first().click()
    await page.getByRole('option', { name: courier.name, exact: true }).click()
    const assignmentResponse = await courierAssignmentResponse
    expect(assignmentResponse.status()).toBe(200)
    await expect.poll(async () => (await db.contractPeriod.findFirst({ where: { contractId }, select: { courierId: true } }))?.courierId).toBe(courier.id)
    const assignmentNotification = await db.message.findFirst({
      where: {
        senderId: owner.id,
        systemCode: 'COURIER_ASSIGNED',
        conversation: {
          OR: [
            { participant1Id: owner.id, participant2Id: courier.id },
            { participant1Id: courier.id, participant2Id: owner.id },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    })
    expect(assignmentNotification?.content).toContain(`Назначен контракт ${contractId}`)
    expect(assignmentNotification?.content).toContain(courier.name)
    expect(assignmentNotification?.content).toContain('статус: ENABLED')

    const unpaidButton = contractRow.getByRole('button', { name: /не оплачен|to.?lanmagan|unpaid/i })
    await expect(unpaidButton).toBeVisible()
    await unpaidButton.click()
    await expect.poll(async () => (await db.contractPeriod.findFirst({ where: { contractId }, select: { paid: true } }))?.paid).toBe(true)
  } finally {
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) {
      const conversations = await db.conversation.findMany({ where: { OR: [{ participant1Id: courierId }, { participant2Id: courierId }] }, select: { id: true } }).catch(() => [])
      if (conversations.length > 0) await db.message.deleteMany({ where: { conversationId: { in: conversations.map((conversation) => conversation.id) } } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { id: { in: conversations.map((conversation) => conversation.id) } } }).catch(() => undefined)
      await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('universal contracts edit opens selected-elements view for multiple contracts', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const customerNames = [`Browser Contract Selected A ${nonce}`, `Browser Contract Selected B ${nonce}`]
  const customerIds: string[] = []
  const contractIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser owner fixture is missing')
    for (const [index, name] of customerNames.entries()) {
      const customer = await db.customer.create({
        data: {
          name,
          phone: `+178${index + 1}${String(Date.now()).slice(-7)}`,
          address: `Selected contract address ${index}`,
          createdBy: owner.id,
          isActive: true,
          autoOrdersEnabled: false,
        },
        select: { id: true },
      })
      customerIds.push(customer.id)
      const contract = await db.contract.create({
        data: {
          customerId: customer.id,
          ownerAdminId: owner.id,
          status: 'ENABLED',
          periods: {
            create: {
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 86_400_000),
              status: 'ENABLED',
              enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
              disabledDates: [],
            },
          },
        },
        select: { id: true },
      })
      contractIds.push(contract.id)
    }

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="contracts"]').click()
    for (const name of customerNames) await expect(page.getByText(name)).toBeVisible()
    await page.locator(`[data-reference-resource-row="contracts"][data-resource-id="${contractIds[0]}"] input[type="checkbox"]`).check()
    await page.locator(`[data-reference-resource-row="contracts"][data-resource-id="${contractIds[1]}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="contracts"]')
    await expect(selected).toBeVisible()
    for (const name of customerNames) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of contractIds) await db.contract.delete({ where: { id } }).catch(() => undefined)
    for (const id of customerIds) await db.customer.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})
test('universal finance edit opens selected-elements view for multiple virtual cards', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const cardNames = [`Browser Finance Selected A ${nonce}`, `Browser Finance Selected B ${nonce}`]
  const cardIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser finance selected-elements owner fixture is missing')
    for (const name of cardNames) {
      const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name, color: '#2563eb', balance: 2500 } })
      cardIds.push(card.id)
    }

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="finance"]').click()
    for (const name of cardNames) await expect(page.locator('aside').getByText(name)).toBeVisible()
    await page.locator(`[data-reference-resource-row="finance"][data-resource-id="${cardIds[0]}"] input[type="checkbox"]`).check()
    await page.locator(`[data-reference-resource-row="finance"][data-resource-id="${cardIds[1]}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="finance"]')
    await expect(selected).toBeVisible()
    for (const name of cardNames) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of cardIds) await db.virtualCard.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal order edit opens selected-elements view for multiple orders', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = Date.now() % 1000000
  const orderNumbers = [920000000 + nonce, 930000000 + nonce]
  const customerIds: string[] = []
  const orderIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser selected-order owner fixture is missing')
    for (const [index, orderNumber] of orderNumbers.entries()) {
      const customer = await db.customer.create({ data: { name: `Browser Selected Order ${nonce}-${index}`, phone: `+199${index}${String(orderNumber).slice(-7)}`, address: `Selected order address ${index}`, createdBy: owner.id, autoOrdersEnabled: false } })
      customerIds.push(customer.id)
      const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, orderStatus: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'CASH', deliveryAddress: customer.address, deliveryDate: new Date(), deliveryTime: null, quantity: 1, calories: 1600 } })
      orderIds.push(order.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="orders"]').click()
    for (const orderNumber of orderNumbers) await page.getByRole('checkbox', { name: `Выбрать заказ ${orderNumber} / ${orderNumber}-buyurtmani tanlash` }).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="orders"]')
    await expect(selected).toBeVisible()
    for (const orderNumber of orderNumbers) await expect(selected.getByRole('listitem').filter({ hasText: String(orderNumber) })).toBeVisible()
  } finally {
    for (const id of orderIds) await db.order.delete({ where: { id } }).catch(() => undefined)
    for (const id of customerIds) await db.customer.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})
test('universal transaction edit opens selected-elements view for multiple transactions', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const descriptions = [`Browser Selected Transaction A ${nonce}`, `Browser Selected Transaction B ${nonce}`]
  const transactionIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser selected-transaction owner fixture is missing')
    for (const [index, description] of descriptions.entries()) {
      const transaction = await db.transaction.create({ data: { adminId: owner.id, amount: index + 5, type: 'INCOME', category: 'MANUAL_ADJUSTMENT', description } })
      transactionIds.push(transaction.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="transactions"]').click()
    for (const description of descriptions) await expect(page.getByText(description)).toBeVisible()
    await page.locator(`[data-reference-resource-row="transactions"][data-resource-id="${transactionIds[0]}"] input[type="checkbox"]`).check()
    await page.locator(`[data-reference-resource-row="transactions"][data-resource-id="${transactionIds[1]}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="transactions"]')
    await expect(selected).toBeVisible()
    for (const description of descriptions) await expect(selected.getByRole('listitem').filter({ hasText: description })).toBeVisible()
  } finally {
    for (const id of transactionIds) await db.transaction.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal route edit opens selected-elements view for multiple routes', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const routeNames = [`Browser Selected Route A ${nonce}`, `Browser Selected Route B ${nonce}`]
  const routeIds: string[] = []
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    const courier = await db.admin.findFirst({ where: { role: 'COURIER', isActive: true }, select: { id: true } })
    if (!owner || !courier) throw new Error('Browser selected-route fixtures are missing')
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    const day = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
    for (const name of routeNames) {
      const route = await db.deliveryRoute.create({ data: { name, color: '#2563eb', weekStart, ownerId: owner.id, courierId: courier.id }, select: { id: true } })
      routeIds.push(route.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="routes"]').click()
    for (const name of routeNames) await expect(page.locator('aside').getByText(name).first()).toBeVisible()
    for (const id of routeIds) await page.locator(`[data-reference-resource-row="routes"][data-resource-id="${id}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="routes"]')
    await expect(selected).toBeVisible()
    for (const name of routeNames) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of routeIds) await db.deliveryRoute.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal ingredient edit opens selected-elements view for multiple ingredients', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const names = [`Browser Selected Ingredient A ${nonce}`, `Browser Selected Ingredient B ${nonce}`]
  const ids: string[] = []
  try {
    for (const name of names) {
      const item = await db.warehouseItem.create({ data: { name, amount: 10, unit: 'kg', pricePerUnit: 100, priceUnit: 'kg', isActive: true } })
      ids.push(item.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="ingredients"]').click()
    for (const name of names) await expect(page.getByText(name)).toBeVisible()
    for (const id of ids) await page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${id}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="ingredients"]')
    await expect(selected).toBeVisible()
    for (const name of names) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of ids) await db.warehouseItem.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal ingredient plus opens and persists a new ingredient', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const name = `Browser Universal Ingredient ${nonce}`
  let id: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="ingredients"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder(/например: Рис|masalan: Guruch/).fill(name)
    await dialog.getByRole('button', { name: /Сохранить|Saqlash/ }).click()
    await expect.poll(async () => {
      const item = await db.warehouseItem.findFirst({ where: { name }, select: { id: true, name: true } })
      id = item?.id
      return item?.name
    }).toBe(name)
  } finally {
    if (id) await db.warehouseItem.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('dishes resource opens selected-elements edit for multiple dishes', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const names = [`Browser Dish A ${nonce}`, `Browser Dish B ${nonce}`]
  const ids: string[] = []
  try {
    for (const name of names) {
      const dish = await db.dish.create({ data: { name, mealType: 'BREAKFAST', ingredients: [{ name: 'Salt', amount: 1, unit: 'gr' }], calorieMappings: {} } })
      ids.push(dish.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="dishes"]').click()
    for (const name of names) await expect(page.getByText(name)).toBeVisible()
    for (const id of ids) await page.locator(`[data-reference-resource-row="dishes"][data-resource-id="${id}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="dishes"]')
    await expect(selected).toBeVisible()
    for (const name of names) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of ids) await db.dish.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal dishes plus opens and persists a new dish', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const name = `Browser Universal Dish ${nonce}`
  let id: string | undefined
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="dishes"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder(/Название блюда|Taom nomi/).fill(name)
    await dialog.getByRole('combobox').first().click()
    await page.getByRole('option').first().click()
    await dialog.getByRole('button', { name: /Сохранить|Saqlash/ }).click()
    await expect.poll(async () => {
      const dish = await db.dish.findFirst({ where: { name }, select: { id: true, name: true } })
      id = dish?.id
      return dish?.name
    }).toBe(name)
  } finally {
    if (id) await db.dish.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('sets resource opens selected-elements edit for multiple sets', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const names = [`Browser Set A ${nonce}`, `Browser Set B ${nonce}`]
  const ids: string[] = []
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    for (const name of names) {
      const set = await db.menuSet.create({ data: { name, description: 'Browser fixture', adminId: owner.id, menuNumber: 0, calorieGroups: {}, isActive: true } })
      ids.push(set.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="sets"]').click()
    for (const name of names) await expect(page.getByText(name)).toBeVisible()
    for (const id of ids) await page.locator(`[data-reference-resource-row="sets"][data-resource-id="${id}"] input[type="checkbox"]`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="sets"]')
    await expect(selected).toBeVisible()
    for (const name of names) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of ids) await db.menuSet.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal sets plus opens and persists a new set', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const name = `Browser Universal Set ${nonce}`
  let id: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="sets"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder(/Set nomi|Название сета|Set name/).fill(name)
    await dialog.getByRole('button', { name: /Создать|Yaratish/ }).click()
    await expect.poll(async () => {
      const set = await db.menuSet.findFirst({ where: { name, adminId: owner.id }, select: { id: true, name: true } })
      id = set?.id
      return set?.name
    }).toBe(name)
  } finally {
    if (id) await db.menuSet.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal chat edit opens selected-elements view for multiple contacts', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const remoteIds: string[] = []
  const contactIds: string[] = []
  const names = [`Browser Chat Contact A ${nonce}`, `Browser Chat Contact B ${nonce}`]
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    for (const [index, name] of names.entries()) {
      const remote = await db.admin.create({ data: { email: `browser-chat-${nonce}-${index}@example.com`, name, role: 'COURIER', phone: `+9989${String(10000000 + index * 1000000 + Number(String(Date.now()).slice(-6)))}`, hasPassword: false } })
      remoteIds.push(remote.id)
      const contact = await db.chatContact.create({ data: { ownerAdminId: owner.id, adminId: remote.id, state: 'ENABLED', name, phone: remote.phone || '', color: index === 0 ? '#2563eb' : '#16a34a', icon: 'user' } })
      contactIds.push(contact.id)
    }
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    for (const name of names) await expect(page.getByText(name, { exact: true })).toBeVisible()
    for (const name of names) await page.getByLabel(`Выбрать ${name}`).check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="chat"]')
    await expect(selected).toBeVisible()
    for (const name of names) await expect(selected.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  } finally {
    for (const id of contactIds) await db.chatContact.delete({ where: { id } }).catch(() => undefined)
    for (const id of remoteIds) await db.admin.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('universal chat plus opens and persists an internal contact', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const name = `Browser Universal Chat ${nonce}`
  let remoteId: string | undefined
  let contactId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const remote = await db.admin.create({ data: { email: `browser-chat-plus-${nonce}@example.com`, name, role: 'COURIER', createdBy: owner.id, phone: `+998${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '7')}`, hasPassword: false } })
    remoteId = remote.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    await page.locator('[data-reference-command="create"]').click()
    const createName = page.getByLabel('Имя').last()
    const createPhone = page.getByLabel('Телефон').last()
    await expect(createName).toBeVisible()
    await createName.fill(name)
    await createPhone.fill(remote.phone || '')
    const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/chat/contacts') && response.request().method() === 'POST')
    await page.getByRole('button', { name: /Создать|Yaratish/ }).last().click()
    const createResponse = await createResponsePromise
    expect(createResponse.status(), await createResponse.text()).toBe(201)
    await expect.poll(async () => {
      const contact = await db.chatContact.findFirst({ where: { ownerAdminId: owner.id, adminId: remoteId }, select: { id: true, name: true } })
      contactId = contact?.id
      return contact?.name
    }).toBe(name)
    const createdContactRow = page.getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first()
    await expect(createdContactRow).toBeVisible()
    await createdContactRow.click()
    const contactCalendar = page.locator('[data-reference-chat-contact-calendar]')
    await expect(contactCalendar).toBeVisible()
    const calendarPanel = contactCalendar.locator('[data-reference-calendar="true"]')
    await expect(calendarPanel).toBeVisible()
    const calendarDay = calendarPanel.locator('button').first()
    await expect(calendarDay).toContainText(/Включен|Yoqilgan/)
    const disableResponse = page.waitForResponse((response) => response.url().endsWith('/api/admin/resource-availability') && response.request().method() === 'PUT' && response.ok())
    await calendarDay.click()
    await disableResponse
    await expect(calendarDay).toContainText(/Отключен|O.chirilgan/)
    const enableResponse = page.waitForResponse((response) => response.url().endsWith('/api/admin/resource-availability') && response.request().method() === 'PUT' && response.ok())
    await calendarDay.click()
    await enableResponse
    await expect(calendarDay).toContainText(/Включен|Yoqilgan/)
    await page.getByRole('button', { name: 'Изменить контакт', exact: true }).click()
    await expect(page.getByLabel('Имя', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Contact name', { exact: true })).toHaveCount(0)
  } finally {
    if (contactId) await db.resourceAvailability.deleteMany({ where: { resourceType: 'CHAT_CONTACT', resourceId: contactId } }).catch(() => undefined)
    if (contactId) await db.chatContact.delete({ where: { id: contactId } }).catch(() => undefined)
    if (remoteId) await db.admin.delete({ where: { id: remoteId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('chat auto-sms persists enabled messages and skips disabled recipients without creating a conversation', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = randomUUID()
  const targetNames = [`Browser Auto SMS Enabled ${nonce}`, `Browser Auto SMS Disabled ${nonce}`]
  const targetIds: string[] = []
  const contactIds: string[] = []
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true, name: true, phone: true } })
    for (const [index, targetName] of targetNames.entries()) {
      const target = await db.admin.create({
        data: {
          email: `browser-auto-sms-${nonce}-${index}@example.com`,
          name: targetName,
          role: 'COURIER',
          createdBy: owner.id,
          phone: `+998${randomUUID().replaceAll('-', '').slice(0, 9)}`,
          hasPassword: false,
        },
      })
      targetIds.push(target.id)
      const contact = await db.chatContact.create({
        data: {
          ownerAdminId: owner.id,
          adminId: target.id,
          type: 'ADMIN',
          state: 'ENABLED',
          name: target.name,
          phone: target.phone || '',
          color: index === 0 ? '#2563eb' : '#16a34a',
          icon: 'user',
        },
      })
      contactIds.push(contact.id)
      if (index === 1) {
        await db.chatContact.create({
          data: {
            ownerAdminId: target.id,
            adminId: owner.id,
            type: 'ADMIN',
            state: 'DISABLED',
            name: owner.name,
            phone: owner.phone || '',
            color: '#dc2626',
            icon: 'user',
          },
        })
      }
    }

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="chat"]').click()
    for (const targetName of targetNames) {
      await expect(page.getByText(targetName, { exact: true })).toBeVisible()
      await page.getByLabel(`Выбрать ${targetName}`).check()
    }
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const response = await page.request.post('/api/chat/auto-sms', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { contactIds, content: `Browser auto SMS ${nonce}` },
    })
    const payload = await response.json()
    expect(response.status(), JSON.stringify(payload)).toBe(200)
    expect(payload).toMatchObject({ sent: 1, skipped: 1 })
    const enabledConversation = await db.conversation.findFirst({ where: { OR: [{ participant1Id: owner.id, participant2Id: targetIds[0] }, { participant1Id: targetIds[0], participant2Id: owner.id }] }, select: { id: true } })
    await expect.poll(async () => enabledConversation ? db.message.count({ where: { conversationId: enabledConversation.id, content: `Browser auto SMS ${nonce}` } }) : 0).toBe(1)
    await expect.poll(async () => db.conversation.count({ where: { OR: [{ participant1Id: owner.id, participant2Id: targetIds[1] }, { participant1Id: targetIds[1], participant2Id: owner.id }] } })).toBe(0)
    await expect(page.getByRole('button', { name: 'Отправить', exact: true })).toBeVisible()
  } finally {
    await Promise.allSettled(contactIds.map((id) => db.chatContact.delete({ where: { id } })))
    for (const id of targetIds) await db.admin.delete({ where: { id } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('groups resource exposes the selected set groups on a first-class surface', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const setName = `Browser Group Set ${nonce}`
  const groupName = `Browser Calorie Group ${nonce}`
  let setId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const set = await db.menuSet.create({ data: { name: setName, adminId: owner.id, menuNumber: 0, isActive: true, calorieGroups: { '1': [{ id: `group-${nonce}`, name: groupName, calories: 1600, price: 12000, dishes: [] }] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="groups"]').click()
    await expect(page.locator('[data-reference-page-surface="groups"]')).toBeVisible()
    const setRow = page.locator(`[data-reference-resource-row="sets"][data-resource-id="${setId}"]`)
    await expect(setRow).toBeVisible()
    await setRow.getByRole('button').click()
    await expect(page.locator('[data-reference-page-surface="groups"]').getByText(groupName, { exact: true })).toBeVisible()
  } finally {
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('groups resource opens selected-elements edit for a selected persisted group', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const setName = `Browser Group Selection Set ${nonce}`
  const groupName = `Browser Group Selection ${nonce}`
  const groupId = `group-${nonce}`
  let setId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const set = await db.menuSet.create({ data: { name: setName, adminId: owner.id, menuNumber: 0, isActive: true, calorieGroups: { '1': [{ id: groupId, name: groupName, calories: 1600, price: 12000, dishes: [] }] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="groups"]').click()
    await expect(page.locator('[data-reference-page-surface="groups"]')).toBeVisible()
    const setRow = page.locator(`[data-reference-resource-row="sets"][data-resource-id="${setId}"]`)
    await expect(setRow).toBeVisible()
    await setRow.getByRole('button').click()
    const groupRow = page.locator(`[data-reference-resource-row="groups"][data-resource-id="${setId}:${groupId}"]`)
    await expect(groupRow).toBeVisible()
    await groupRow.locator('input[type="checkbox"]').check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="groups"]')
    await expect(selected).toBeVisible()
    await expect(selected.getByRole('listitem').filter({ hasText: groupName })).toBeVisible()
  } finally {
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('groups universal plus persists a new owner-scoped group through the selected set', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const setName = `Browser Group Create Set ${nonce}`
  const groupName = `Browser Group Created ${nonce}`
  let setId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const set = await db.menuSet.create({ data: { name: setName, adminId: owner.id, menuNumber: 0, isActive: true, calorieGroups: { '1': [] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="groups"]').click()
    const setRow = page.locator(`[data-reference-resource-row="sets"][data-resource-id="${setId}"]`)
    await expect(setRow).toBeVisible()
    await setRow.getByRole('button').click()
    await page.locator('[data-reference-command="create"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder(/название группы|group name/i).fill(groupName)
    await dialog.locator('input[type="number"]').fill('15000')
    await dialog.getByRole('button', { name: /сохранить изменения|save changes/i }).click()
    await expect.poll(async () => {
      const saved = await db.menuSet.findUnique({ where: { id: setId }, select: { calorieGroups: true } })
      const groups = (saved?.calorieGroups as Record<string, Array<{ name?: string }>> | null)?.['1'] ?? []
      return groups.some((group) => group.name === groupName)
    }).toBe(true)
  } finally {
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('groups universal edit saves the selected group through its owner-scoped set', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const setName = `Browser Group Edit Set ${nonce}`
  const groupId = `group-${nonce}`
  const groupName = `Browser Group Before ${nonce}`
  const editedGroupName = `Browser Group After ${nonce}`
  let setId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const set = await db.menuSet.create({ data: { name: setName, adminId: owner.id, menuNumber: 0, isActive: true, calorieGroups: { '1': [{ id: groupId, name: groupName, calories: 1600, price: 12000, dishes: [] }] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="groups"]').click()
    const setRow = page.locator(`[data-reference-resource-row="sets"][data-resource-id="${setId}"]`)
    await expect(setRow).toBeVisible()
    await setRow.getByRole('button').click()
    const groupRow = page.locator(`[data-reference-resource-row="groups"][data-resource-id="${setId}:${groupId}"]`)
    await groupRow.locator('input[type="checkbox"]').check()
    await page.locator('[data-reference-command="edit"]').click()
    const selected = page.locator('[data-reference-selected-elements="groups"]')
    await expect(selected).toBeVisible()
    await selected.getByRole('listitem').filter({ hasText: groupName }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder(/название группы|group name/i).fill(editedGroupName)
    await dialog.locator('input[type="number"]').fill('13000')
    await dialog.getByRole('button', { name: /сохранить изменения|save changes/i }).click()
    await expect.poll(async () => {
      const saved = await db.menuSet.findUnique({ where: { id: setId }, select: { calorieGroups: true } })
      const groups = (saved?.calorieGroups as Record<string, Array<{ name?: string }>> | null)?.['1'] ?? []
      return groups.some((group) => group.name === editedGroupName)
    }).toBe(true)
  } finally {
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('group calendar override uses composite identity and persists within the owner scope', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const groupId = `group-${nonce}`
  const date = new Date(Date.now() + 8 * 86_400_000).toISOString().slice(0, 10)
  let setId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const set = await db.menuSet.create({ data: { name: `Browser Group Calendar Set ${nonce}`, adminId: owner.id, menuNumber: 0, isActive: true, calorieGroups: { '1': [{ id: groupId, name: `Browser Group Calendar ${nonce}`, calories: 1600, price: 12000, dishes: [] }] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const resourceId = `${setId}:${groupId}`
    const write = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'GROUP', resourceId, date, state: 'DISABLED', reason: `browser group calendar ${nonce}` } })
    expect(write.status()).toBe(200)
    const read = await page.request.get(`/api/admin/resource-availability?resourceType=GROUP&resourceId=${encodeURIComponent(resourceId)}&from=${date}&to=${date}`)
    expect(read.status()).toBe(200)
    await expect.poll(async () => (await read.json()).overrides?.some((override: { resourceId?: string; state?: string }) => override.resourceId === resourceId && override.state === 'DISABLED')).toBe(true)
  } finally {
    if (setId) {
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'GROUP', resourceId: { startsWith: setId } } }).catch(() => undefined)
      await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('cooking rejects a cross-scope active set before creating a record or deducting inventory', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = new Date(Date.now() + 9 * 86_400_000)
  date.setUTCHours(0, 0, 0, 0)
  let otherAdminId: string | undefined
  let setId: string | undefined
  let dishId: string | undefined
  let itemId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Cooking scope owner fixture is missing')
    const otherAdmin = await db.admin.create({ data: { email: `browser-cooking-other-${nonce}@example.com`, name: `Browser Cooking Other ${nonce}`, role: 'MIDDLE_ADMIN', isActive: true } })
    otherAdminId = otherAdmin.id
    const dish = await db.dish.create({ data: { name: `Browser scoped dish ${nonce}`, mealType: 'LUNCH', ingredients: [{ name: `Browser scoped rice ${nonce}`, amount: 100, unit: 'g' }] } })
    dishId = dish.id
    const item = await db.warehouseItem.create({ data: { name: `Browser scoped rice ${nonce}`, amount: 500, unit: 'g', isActive: true } })
    itemId = item.id
    const set = await db.menuSet.create({ data: { name: `Browser foreign cooking set ${nonce}`, adminId: otherAdmin.id, menuNumber: 1, isActive: true, calorieGroups: { '1': [{ id: `group-${nonce}`, calories: 1200, dishes: [{ dishId: dish.id, dishName: dish.name, mealType: dish.mealType }] }] } } })
    setId = set.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/warehouse/cook', { data: { date: date.toISOString(), menuNumber: 1, activeSetId: set.id, updates: [{ dishId: dish.id, calorie: 1200, amount: 1 }] } })
    expect(response.status()).toBe(403)
    expect(await db.warehouseItem.findUnique({ where: { id: item.id }, select: { amount: true } })).toMatchObject({ amount: 500 })
    expect(await db.dailyCookingPlan.findFirst({ where: { date } })).toBeNull()
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date } }).catch(() => undefined)
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    if (dishId) await db.dish.delete({ where: { id: dishId } }).catch(() => undefined)
    if (itemId) await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    if (otherAdminId) await db.admin.delete({ where: { id: otherAdminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking rejects foreign client provenance before persisting the cooking record', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = new Date(Date.now() + 10 * 86_400_000)
  date.setUTCHours(0, 0, 0, 0)
  let foreignAdminId: string | undefined
  let clientId: string | undefined
  let dishId: string | undefined
  let itemId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Cooking provenance owner fixture is missing')
    const foreignAdmin = await db.admin.create({ data: { email: `browser-provenance-other-${nonce}@example.com`, name: `Browser Provenance Other ${nonce}`, role: 'MIDDLE_ADMIN', isActive: true } })
    foreignAdminId = foreignAdmin.id
    const client = await db.customer.create({ data: { name: `Browser foreign provenance ${nonce}`, phone: `+1777${String(Date.now()).slice(-7)}`, address: 'Browser provenance address', createdBy: foreignAdmin.id, isActive: true } })
    clientId = client.id
    const dish = await db.dish.create({ data: { name: `Browser provenance dish ${nonce}`, mealType: 'LUNCH', ingredients: [{ name: `Browser provenance rice ${nonce}`, amount: 100, unit: 'g' }] } })
    dishId = dish.id
    const item = await db.warehouseItem.create({ data: { name: `Browser provenance rice ${nonce}`, amount: 500, unit: 'g', isActive: true } })
    itemId = item.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/warehouse/cook', { data: { date: date.toISOString(), menuNumber: 1, updates: [{ dishId: dish.id, calorie: 1200, amount: 1, actualIngredients: [{ name: item.name, amount: 100, unit: 'g' }], provenance: { clientIds: [client.id] } }] } })
    expect(response.status()).toBe(403)
    expect(await db.warehouseItem.findUnique({ where: { id: item.id }, select: { amount: true } })).toMatchObject({ amount: 500 })
    expect(await db.dailyCookingPlan.findFirst({ where: { date } })).toBeNull()
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date } }).catch(() => undefined)
    if (dishId) await db.dish.delete({ where: { id: dishId } }).catch(() => undefined)
    if (itemId) await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    if (clientId) await db.customer.delete({ where: { id: clientId } }).catch(() => undefined)
    if (foreignAdminId) await db.admin.delete({ where: { id: foreignAdminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking derives persisted provenance from the effective order graph', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = new Date(Date.now() + (11 + Math.floor(Math.random() * 1000)) * 86_400_000)
  date.setUTCHours(0, 0, 0, 0)
  const orderNumber = 920000000 + Number.parseInt(randomUUID().replace(/\D/g, '').slice(0, 8), 10)
  let setId: string | undefined
  let clientId: string | undefined
  let contractId: string | undefined
  let orderId: string | undefined
  let dishId: string | undefined
  let itemId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Cooking provenance owner fixture is missing')
    const dish = await db.dish.create({ data: { name: `Browser derived provenance dish ${nonce}`, mealType: 'LUNCH', ingredients: [{ name: `Browser derived rice ${nonce}`, amount: 100, unit: 'g' }] } })
    dishId = dish.id
    const item = await db.warehouseItem.create({ data: { name: `Browser derived rice ${nonce}`, amount: 500, unit: 'g', isActive: true } })
    itemId = item.id
    const set = await db.menuSet.create({ data: { name: `Browser derived provenance set ${nonce}`, adminId: owner.id, menuNumber: 1, isActive: true, calorieGroups: { '1': [{ id: `group-${nonce}`, calories: 1200, dishes: [{ dishId: dish.id, dishName: dish.name, mealType: dish.mealType }] }] } } })
    setId = set.id
    const client = await db.customer.create({ data: { name: `Browser derived provenance client ${nonce}`, phone: `+1888${String(Date.now()).slice(-7)}`, address: 'Browser derived provenance address', createdBy: owner.id, assignedSetId: set.id, calories: 1200, isActive: true } })
    clientId = client.id
    const contract = await db.contract.create({ data: { customerId: client.id, ownerAdminId: owner.id, status: 'ENABLED' } })
    contractId = contract.id
    const order = await db.order.create({ data: { orderNumber, customerId: client.id, adminId: owner.id, orderStatus: 'PENDING', paymentStatus: 'PAID', deliveryAddress: client.address, deliveryDate: date, quantity: 1, calories: 1200 } })
    orderId = order.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/warehouse/cook', { data: { date: date.toISOString(), menuNumber: 1, activeSetId: set.id, updates: [{ dishId: dish.id, calorie: 1200, amount: 1 }] } })
    expect(response.status()).toBe(200)
    const plan = await db.dailyCookingPlan.findUnique({ where: { date } })
    const records = Array.isArray(plan?.consumption) ? plan.consumption as Array<{ provenance?: { clientIds?: string[]; contractIds?: string[]; orderIds?: string[]; setId?: string; groupCalories?: number } }> : []
    expect(records[0]?.provenance).toMatchObject({ clientIds: [client.id], contractIds: [contract.id], orderIds: [order.id], setId: set.id, groupCalories: 1200 })
    const log = await db.actionLog.findFirst({ where: { adminId: owner.id, action: 'COOK_DISH', entityType: 'COOKING_RECORD', entityId: plan?.id }, orderBy: { createdAt: 'desc' } })
    expect(log).toMatchObject({ adminId: owner.id, action: 'COOK_DISH', entityType: 'COOKING_RECORD', entityId: plan?.id })
    expect(log?.details).toContain(order.id)
    expect(await db.warehouseItem.findUnique({ where: { id: item.id }, select: { amount: true } })).toMatchObject({ amount: 400 })
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (clientId) await db.customer.delete({ where: { id: clientId } }).catch(() => undefined)
    if (setId) await db.menuSet.delete({ where: { id: setId } }).catch(() => undefined)
    if (dishId) await db.dish.delete({ where: { id: dishId } }).catch(() => undefined)
    if (itemId) await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking rejects an unknown dish without creating an orphan record', async ({ page }) => {
  const db = new PrismaClient()
  const date = new Date(Date.now() + 12 * 86_400_000)
  date.setUTCHours(0, 0, 0, 0)
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/warehouse/cook', { data: { date: date.toISOString(), menuNumber: 1, updates: [{ dishId: `missing-dish-${Date.now()}`, calorie: 1200, amount: 1 }] } })
    expect(response.status()).toBe(404)
    expect(await db.dailyCookingPlan.findFirst({ where: { date } })).toBeNull()
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('cooking rejects a disabled dish without creating a cooking record', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const date = new Date(Date.now() + (13 + Math.floor(Math.random() * 1000)) * 86_400_000)
  date.setUTCHours(0, 0, 0, 0)
  let dishId: string | undefined
  try {
    const dish = await db.dish.create({ data: { name: `Browser disabled cooking dish ${nonce}`, mealType: 'LUNCH', ingredients: [{ name: `Browser disabled rice ${nonce}`, amount: 100, unit: 'g' }], isActive: false } })
    dishId = dish.id
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    const response = await page.request.post('/api/admin/warehouse/cook', { data: { date: date.toISOString(), menuNumber: 1, updates: [{ dishId: dish.id, calorie: 1200, amount: 1 }] } })
    expect(response.status()).toBe(404)
    expect(await db.dailyCookingPlan.findFirst({ where: { date } })).toBeNull()
  } finally {
    await db.dailyCookingPlan.deleteMany({ where: { date } }).catch(() => undefined)
    if (dishId) await db.dish.delete({ where: { id: dishId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('client order history exposes only RU and UZ user-facing copy', async ({ page }) => {
  const db = new PrismaClient()
  const phone = `+1889${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  try {
    const customer = await db.customer.create({ data: { name: 'Browser Client History Locale', phone, address: 'History locale address', autoOrdersEnabled: false } })
    customerId = customer.id
    const token = jwt.sign({ id: customer.id, phone: customer.phone, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'test-jwt-secret', { algorithm: 'HS256' })
    await page.addInitScript((value) => localStorage.setItem('customerToken', value), token)
    await page.goto('/sites/example-healthy-food/history')
    await expect(page).toHaveURL(/\/sites\/example-healthy-food\/history/)
    await expect(page.getByRole('heading', { name: /История заказов|Buyurtmalar tarixi/i })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/Order history|Calories|Payment|Delivered|Active|Search orders|No orders found|Filter|Sort by|Order #|client portal|\bHistory\b|\bClient\b/i)
  } finally {
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('statistics period range requests effective client-day filtering for a bounded window', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const target = new Date(Date.now() + 40 * 86_400_000)
  target.setUTCHours(12, 0, 0, 0)
  const targetDate = target.toISOString().slice(0, 10)
  const orderNumber = 860000000 + Number.parseInt(nonce.replace(/\D/g, '').slice(0, 8), 10)
  let customerId: string | undefined
  let orderId: string | undefined

  const statisticsRequests: string[] = []
  let normalizeDraftCalls = 0
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/api/admin/statistics?')) {
      statisticsRequests.push(url)
    }
    if (url.includes('/api/admin/dispatch/normalize-drafts')) {
      normalizeDraftCalls += 1
    }
  })

  const readRangeCounters = async () => {
    const response = await page.request.get(`/api/admin/statistics?from=${targetDate}&to=${targetDate}`)
    expect(response.status()).toBe(200)
    const body = await response.json()
    return { unpaid: Number(body.unpaidOrders), midCalorie: Number(body.orders1600) }
  }

  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await expect(page.getByTestId('orders-tab-content')).toBeVisible()

    const calendarTrigger = page.locator('button:has(svg.lucide-calendar-days)').first()
    await expect(calendarTrigger).toBeVisible()
    await calendarTrigger.click()
    const popover = page.locator('[data-radix-popper-content-wrapper]')
    const visibleDay = (day: number) => popover.locator('button.rdp-button:not(.day-outside)').filter({ hasText: new RegExp(`^${day}$`) }).first()
    await visibleDay(1).click()
    await visibleDay(15).click()
    await expect.poll(() => statisticsRequests.some((url) => {
      try {
        const params = new URL(url).searchParams
        const from = params.get('from')
        const to = params.get('to')
        return Boolean(from && to && from.endsWith('-01') && from !== to)
      } catch {
        return false
      }
    }), { timeout: 10000 }).toBe(true)
    await expect.poll(() => statisticsRequests.every((url) => !url.includes('date=')), { timeout: 2000 }).toBe(true)

    // Wait until the dashboard order-view normalization has settled so the
    // fixture order persists as a pending draft for the bounded window.
    await expect.poll(() => normalizeDraftCalls, { timeout: 15000 }).toBeGreaterThan(0)

    const owner = await db.admin.findUniqueOrThrow({ where: { email: process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com' }, select: { id: true } })
    const customer = await db.customer.create({ data: { name: `Browser Stats Range ${nonce}`, phone: `+1777${String(Date.now()).slice(-7)}`, address: 'Stats range browser address', createdBy: owner.id, isActive: true, deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }), autoOrdersEnabled: false } })
    customerId = customer.id
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, orderStatus: 'PENDING', deliveryAddress: customer.address, deliveryDate: target, quantity: 1, calories: 1600 } })
    orderId = order.id

    expect(await readRangeCounters()).toEqual({ unpaid: 1, midCalorie: 1 })

    const disable = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'CLIENT', resourceIds: [customer.id], date: targetDate, state: 'DISABLED', reason: `browser stats range ${nonce}` } })
    expect(disable.status()).toBe(200)
    expect(await readRangeCounters()).toEqual({ unpaid: 0, midCalorie: 0 })

    const restore = await page.request.put('/api/admin/resource-availability', { data: { resourceType: 'CLIENT', resourceIds: [customer.id], date: targetDate, state: 'ENABLED', reason: `browser stats range restored ${nonce}` } })
    expect(restore.status()).toBe(200)
    expect(await readRangeCounters()).toEqual({ unpaid: 1, midCalorie: 1 })

    const malformed = await page.request.get('/api/admin/statistics?from=not-a-date&to=2026-08-26')
    expect(malformed.status()).toBe(400)
  } finally {
    if (customerId) {
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'CLIENT', resourceId: customerId } }).catch(() => undefined)
    }
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('contract period calendar marks the enabled first day with the courier color', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const courierName = `Browser marker courier ${nonce}`
  const start = new Date(Date.now() + 86_400_000)
  start.setUTCHours(0, 0, 0, 0)
  const startKey = start.toISOString().slice(0, 10)
  const endKey = new Date(start.getTime() + 6 * 86_400_000).toISOString().slice(0, 10)
  let customerId: string | undefined
  let contractId: string | undefined
  let courierId: string | undefined
  try {
    const owner = await db.admin.findUnique({ where: { email: 'middle@example.com' }, select: { id: true } })
    if (!owner) throw new Error('Browser marker owner fixture is missing')
    const courier = await db.admin.create({ data: { email: `browser-marker-courier-${nonce}@example.test`, name: courierName, role: 'COURIER', createdBy: owner.id, phone: `+1777${String(Date.now()).slice(-7)}` }, select: { id: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser marker customer ${nonce}`, phone: `+1555${String(Date.now()).slice(-7)}`, address: 'Browser Marker Address', createdBy: owner.id, isActive: true, autoOrdersEnabled: false } })
    customerId = customer.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const response = await page.request.post('/api/admin/contracts', {
      data: {
        customerId: customer.id,
        courierId,
        autoRenew: false,
        status: 'ENABLED',
        paid: false,
        period: { startDate: startKey, endDate: endKey, courierId, color: '#2563eb', status: 'ENABLED', paid: false, autoRenew: false, enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], disabledDates: [] },
      },
    })
    expect(response.status()).toBe(201)
    const created = await response.json()
    contractId = created.contract?.id
    expect(contractId).toEqual(expect.any(String))
    const period = await db.contractPeriod.findFirst({ where: { contractId: contractId! }, select: { id: true } })
    expect(period?.id).toEqual(expect.any(String))

    await page.locator('[data-reference-page="contracts"]').click()
    const contractRow = page.locator(`[data-resource-id="${contractId}"]`)
    await expect(contractRow).toBeVisible()
    await contractRow.getByRole('button', { name: 'Expand' }).click()
    const calendar = contractRow.locator('[data-reference-calendar="true"]')
    await expect(calendar).toBeVisible()

    const markerButton = calendar.locator(`button[data-period-first-day="${period!.id}"]`)
    await expect(markerButton).toBeVisible()
    expect(await markerButton.getAttribute('style')).toContain('rgb(37, 99, 235)')
    await expect(markerButton).toHaveAttribute('title', new RegExp(`${courierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))

    // The first period day sits at calendar index 1 (tomorrow inside the 7-day window).
    const dayButton = calendar.locator('button').nth(1)
    await dayButton.click()
    await expect(dayButton).toContainText('Отключен')
    await expect(calendar.locator('button[data-period-first-day]')).toHaveCount(0)

    await dayButton.click()
    await expect(calendar.locator(`button[data-period-first-day="${period!.id}"]`)).toHaveCount(1)
    await expect(calendar.locator('button[data-period-first-day]')).toBeVisible()
  } finally {
    if (contractId) {
      await db.message.deleteMany({ where: { content: { contains: contractId } } }).catch(() => undefined)
      await db.actionLog.deleteMany({ where: { entityId: contractId } }).catch(() => undefined)
      await db.resourceAvailability.deleteMany({ where: { resourceType: 'CONTRACT', resourceId: contractId } }).catch(() => undefined)
      await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    }
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('purchase completion audit records the correlation key and stays single-effect on retry', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ingredientName = `Browser completion audit ingredient ${nonce}`
  const idempotencyKey = `completion-audit-${nonce}`
  let cardId: string | undefined
  let purchaseId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: 'middle@example.com' }, select: { id: true } })
    const card = await db.virtualCard.create({ data: { ownerAdminId: owner.id, name: `Browser completion audit card ${nonce}`, color: '#2563eb', balance: 100000 } })
    cardId = card.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const createResponse = await page.request.post('/api/admin/finance/purchases', {
      data: { title: `Browser completion audit purchase ${nonce}`, items: [{ name: ingredientName, amount: 2, unit: 'kg', costPerUnit: 250 }], idempotencyKey: `draft-${nonce}` },
    })
    expect(createResponse.status()).toBe(201)
    purchaseId = (await createResponse.json()).purchase?.id
    expect(purchaseId).toEqual(expect.any(String))

    const firstResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id, idempotencyKey } })
    expect(firstResponse.status()).toBe(200)
    const firstBody = await firstResponse.json()
    expect(firstBody.purchase.status).toBe('COMPLETED')
    expect(firstBody.purchase.transactionId).toEqual(expect.any(String))

    const retryResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { virtualCardId: card.id, idempotencyKey } })
    expect(retryResponse.status()).toBe(200)
    const retryBody = await retryResponse.json()
    expect(retryBody.purchase.transactionId).toBe(firstBody.purchase.transactionId)

    const invalidResponse = await page.request.post(`/api/admin/finance/purchases/${purchaseId}/complete`, { data: { idempotencyKey: 'short' } })
    expect(invalidResponse.status()).toBe(400)

    const [auditLogs, transactions, inventory, persistedCard] = await Promise.all([
      db.actionLog.findMany({ where: { action: 'COMPLETE_PURCHASE', entityType: 'PURCHASE', entityId: purchaseId! } }),
      db.transaction.count({ where: { virtualCardId: card.id } }),
      db.warehouseItem.findUnique({ where: { name: ingredientName }, select: { amount: true, unit: true } }),
      db.virtualCard.findUnique({ where: { id: card.id }, select: { balance: true } }),
    ])
    expect(auditLogs).toHaveLength(1)
    const details = JSON.parse(auditLogs[0].details ?? '{}')
    expect(details.result).toBe('SUCCESS')
    expect(details.idempotencyKey).toBe(idempotencyKey)
    expect(transactions).toBe(1)
    expect(inventory).toMatchObject({ amount: 2, unit: 'kg' })
    expect(persistedCard).toMatchObject({ balance: 99500 })
  } finally {
    if (purchaseId) {
      await db.actionLog.deleteMany({ where: { action: 'COMPLETE_PURCHASE', entityType: 'PURCHASE', entityId: purchaseId } }).catch(() => undefined)
      await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
      await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    }
    if (cardId) {
      await db.transaction.deleteMany({ where: { virtualCardId: cardId } }).catch(() => undefined)
      await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    }
    await db.warehouseItem.delete({ where: { name: ingredientName } }).catch(() => undefined)
    await db.$disconnect()
  }
})
