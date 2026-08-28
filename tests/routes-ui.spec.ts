import { expect, test } from '@playwright/test'

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'


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
  const mapPanel = page.locator('[data-reference-map="routes"]')
  await expect(mapPanel).toBeVisible()
  await expect(mapPanel).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await page.getByRole('button', { name: /выделить область|hududni belgilash/i }).click()
  await expect(page.locator('[data-reference-route-boundary]')).toBeVisible()
})

test('routes previous and continue navigate whole local weeks', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await page.locator('[data-reference-page="routes"]').click()
  const selectedDate = page.locator('input[type="date"]').first()
  const initialDate = await selectedDate.inputValue()
  const nextDate = new Date(`${initialDate}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + 7)
  const expectedNextDate = nextDate.toISOString().slice(0, 10)
  await page.getByRole('button', { name: /следующий|keyingi|next/i }).click()
  await expect(selectedDate).toHaveValue(expectedNextDate)
  await page.getByRole('button', { name: /предыдущий|oldingi|previous/i }).click()
  await expect(selectedDate).toHaveValue(initialDate)
})

test('route stop reorder saves and reloads in the persisted position order', async ({ page }) => {
  const db = new PrismaClient()
  const orderNumberBase = 820000000 + Number.parseInt(randomUUID().replace(/\D/g, '').slice(0, 8), 10)
  const weekStartDate = new Date()
  weekStartDate.setHours(0, 0, 0, 0)
  const day = weekStartDate.getDay()
  weekStartDate.setDate(weekStartDate.getDate() - (day === 0 ? 6 : day - 1))
  const weekStart = weekStartDate.toISOString().slice(0, 10)
  const middleEmail = process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com'
  let routeId: string | undefined
  let customerId: string | undefined
  let createdCourierId: string | undefined
  const orderIds: string[] = []

  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: middleEmail } })
    const existingCourier = await db.admin.findFirst({ where: { role: 'COURIER', isActive: true, createdBy: owner.id } })
    const courier = existingCourier ?? await db.admin.create({
      data: {
        email: `browser-route-courier-${orderNumberBase}@example.com`,
        name: 'Browser Route Courier',
        role: 'COURIER',
        createdBy: owner.id,
        hasPassword: false,
      },
    })
    if (!existingCourier) createdCourierId = courier.id
    const customer = await db.customer.create({
      data: {
        name: 'Browser Route Reorder Customer',
        phone: `+1777${String(orderNumberBase).slice(-7)}`,
        address: 'Browser Route Reorder Address',
        createdBy: owner.id,
        autoOrdersEnabled: false,
      },
    })
    customerId = customer.id
    const deliveryDate = new Date()
    deliveryDate.setHours(12, 0, 0, 0)
    for (const [index, name] of ['First stop', 'Second stop'].entries()) {
      const order = await db.order.create({
        data: {
          orderNumber: orderNumberBase + index,
          customerId: customer.id,
          adminId: owner.id,
          courierId: courier.id,
          orderStatus: 'PENDING',
          deliveryDate,
          deliveryAddress: `${name}, ${customer.address}`,
        },
      })
      orderIds.push(order.id)
    }
    const route = await db.deliveryRoute.create({
      data: {
        name: `Browser reorder ${orderNumberBase}`,
        color: '#42a85f',
        weekStart: weekStartDate,
        ownerId: owner.id,
        courierId: courier.id,
        boundary: { x: 0.1, y: 0.15, width: 0.45, height: 0.35 },
        stops: { create: orderIds.map((orderId, position) => ({ orderId, position })) },
      },
    })
    routeId = route.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(middleEmail)
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
    await page.locator('[data-reference-page="routes"]').click()
    await page.getByRole('button', { name: /новый маршрут|yangi marshrut|new route/i }).click()
    const draftOrders = page.locator('[data-reference-route-draft-orders]')
    await expect(draftOrders).toBeVisible()
    await expect(draftOrders.getByRole('button', { name: new RegExp(`#${orderNumberBase}`) })).toBeVisible()
    await page.getByRole('button', { name: /новый маршрут|yangi marshrut|new route/i }).click()
    const routeButton = page.getByRole('button', { name: new RegExp(route.name) }).first()
    await expect(routeButton).toBeVisible()
    await routeButton.click()
    await expect(page.locator('[data-reference-route-boundary]')).toBeVisible()
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="edit"]').click()
    const routeEditor = page.locator('[data-reference-route-editor]')
    await expect(routeEditor).toBeVisible()
    const editedRouteName = `${route.name} edited`
    await expect(routeEditor.getByLabel(/название|nomi|name/i)).toHaveValue(route.name)
    await routeEditor.getByLabel(/название|nomi|name/i).fill(editedRouteName)
    await page.getByRole('button', { name: /выделить область|hududni belgilash/i }).click()
    await expect(page.locator('[data-reference-route-boundary]')).toHaveAttribute('style', /left:\s*15%/)
    const editResponse = page.waitForResponse((response) => response.url().includes(`/api/admin/routes/${routeId}`) && response.request().method() === 'PATCH' && response.ok())
    await routeEditor.getByRole('button', { name: /сохранить|saqlash|save/i }).click()
    await editResponse
    await expect(page.getByRole('button', { name: new RegExp(editedRouteName) }).first()).toBeVisible()
    const editedRoute = await db.deliveryRoute.findUnique({ where: { id: routeId }, select: { name: true, boundary: true, courierId: true, color: true } })
    expect(editedRoute).toMatchObject({ name: editedRouteName, boundary: { x: 0.15, y: 0.2, width: 0.5, height: 0.5 }, courierId: courier.id, color: '#42a85f' })

    const stops = page.locator('[data-reference-route-stop]')
    await expect(stops).toHaveCount(2)
    await expect(stops.first().locator('[data-reference-calendar="true"]')).toBeVisible()
    await stops.nth(0).getByRole('button', { name: /вниз|pastga|down/i }).click()
    const saveResponse = page.waitForResponse((response) => response.url().includes(`/api/admin/routes/${routeId}`) && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: /сохранить|saqlash|save/i }).first().click()
    expect((await saveResponse).ok()).toBe(true)

    const response = await page.request.get(`/api/admin/routes?weekStart=${weekStart}`)
    expect(response.ok()).toBe(true)
    const routes = await response.json()
    const saved = routes.find((candidate: { id: string }) => candidate.id === routeId)
    expect(saved.stops.map((stop: { order: { id: string } }) => stop.order.id)).toEqual([orderIds[1], orderIds[0]])
    expect(saved.stops.map((stop: { position: number }) => stop.position)).toEqual([0, 1])
  } finally {
    if (routeId) await db.deliveryRoute.delete({ where: { id: routeId } }).catch(() => undefined)
    if (orderIds.length) await db.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (createdCourierId) await db.admin.delete({ where: { id: createdCourierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('routes exclude disabled client, route, contract, and route-stop days without deleting route history', async ({ page }) => {
  const db = new PrismaClient()
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const middleEmail = process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com'
  const orderNumber = 830000000 + Number.parseInt(randomUUID().replace(/\D/g, '').slice(0, 8), 10)
  let routeId: string | undefined
  let orderId: string | undefined
  let customerId: string | undefined
  let courierId: string | undefined
  let availabilityId: string | undefined
  let routeAvailabilityId: string | undefined
  let routeStopAvailabilityId: string | undefined
  let contractId: string | undefined
  try {
    const owner = await db.admin.findUniqueOrThrow({ where: { email: middleEmail }, select: { id: true } })
    const courier = await db.admin.create({ data: { email: `browser-route-disabled-courier-${nonce}@example.test`, name: `Browser disabled route courier ${nonce}`, role: 'COURIER', createdBy: owner.id, hasPassword: false }, select: { id: true } })
    courierId = courier.id
    const customer = await db.customer.create({ data: { name: `Browser disabled route customer ${nonce}`, phone: `+1888${String(orderNumber).slice(-7)}`, address: 'Browser disabled route address', createdBy: owner.id, autoOrdersEnabled: false } })
    customerId = customer.id
    const weekStartDate = new Date()
    weekStartDate.setHours(0, 0, 0, 0)
    const day = weekStartDate.getDay()
    weekStartDate.setDate(weekStartDate.getDate() - (day === 0 ? 6 : day - 1))
    const deliveryDate = new Date(weekStartDate)
    deliveryDate.setDate(deliveryDate.getDate() + 1)
    const order = await db.order.create({ data: { orderNumber, customerId: customer.id, adminId: owner.id, courierId: courier.id, orderStatus: 'PENDING', deliveryDate, deliveryAddress: customer.address } })
    orderId = order.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', periods: { create: { startDate: deliveryDate, endDate: new Date(deliveryDate.getTime() + 86400000), status: 'ENABLED', enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], disabledDates: [] } } }, select: { id: true } })
    contractId = contract.id
    const route = await db.deliveryRoute.create({ data: { name: `Browser disabled route ${nonce}`, color: '#2563eb', weekStart: weekStartDate, ownerId: owner.id, courierId: courier.id, stops: { create: { orderId: order.id, position: 0 } } } })
    routeId = route.id
    const availability = await db.resourceAvailability.create({ data: { resourceType: 'CLIENT', resourceId: customer.id, date: deliveryDate, state: 'DISABLED', reason: 'browser route proof' } })
    availabilityId = availability.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(middleEmail)
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    const disabledResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(disabledResponse.status()).toBe(200)
    const disabledRoutes = await disabledResponse.json()
    const disabledRoute = disabledRoutes.find((candidate: { id: string }) => candidate.id === route.id)
    expect(disabledRoute).toBeDefined()
    expect(disabledRoute.stops).toHaveLength(0)

    await db.resourceAvailability.delete({ where: { id: availability.id } })
    const enabledResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(enabledResponse.status()).toBe(200)
    const enabledRoutes = await enabledResponse.json()
    const enabledRoute = enabledRoutes.find((candidate: { id: string }) => candidate.id === route.id)
    expect(enabledRoute.stops.map((stop: { order: { id: string } }) => stop.order.id)).toEqual([order.id])

    const routeAvailability = await db.resourceAvailability.create({ data: { resourceType: 'ROUTE', resourceId: route.id, date: deliveryDate, state: 'DISABLED', reason: 'browser route-day proof' } })
    routeAvailabilityId = routeAvailability.id
    const routeDisabledResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(routeDisabledResponse.status()).toBe(200)
    const routeDisabled = (await routeDisabledResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(routeDisabled.stops).toHaveLength(0)

    await db.resourceAvailability.delete({ where: { id: routeAvailability.id } })
    const routeRestoredResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(routeRestoredResponse.status()).toBe(200)
    const routeRestored = (await routeRestoredResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(routeRestored.stops.map((stop: { order: { id: string } }) => stop.order.id)).toEqual([order.id])

    await db.contractPeriod.updateMany({ where: { contractId }, data: { disabledDates: [deliveryDate.toISOString().slice(0, 10)] } })
    const contractDisabledResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(contractDisabledResponse.status()).toBe(200)
    const contractDisabledRoute = (await contractDisabledResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(contractDisabledRoute.stops).toHaveLength(0)

    await db.contractPeriod.updateMany({ where: { contractId }, data: { disabledDates: [] } })
    const contractRestoredResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(contractRestoredResponse.status()).toBe(200)
    const contractRestoredRoute = (await contractRestoredResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(contractRestoredRoute.stops.map((stop: { order: { id: string } }) => stop.order.id)).toEqual([order.id])

    const routeStop = await db.deliveryRouteStop.findFirst({ where: { routeId: route.id }, select: { id: true } })
    if (!routeStop) throw new Error('Route stop fixture is missing')
    const routeStopAvailability = await db.resourceAvailability.create({ data: { resourceType: 'ROUTE_STOP', resourceId: routeStop.id, date: deliveryDate, state: 'DISABLED', reason: 'browser route-stop proof' } })
    routeStopAvailabilityId = routeStopAvailability.id
    const stopDisabledResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(stopDisabledResponse.status()).toBe(200)
    const stopDisabledRoute = (await stopDisabledResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(stopDisabledRoute.stops).toHaveLength(0)

    await db.resourceAvailability.delete({ where: { id: routeStopAvailability.id } })
    routeStopAvailabilityId = undefined
    const stopRestoredResponse = await page.request.get(`/api/admin/routes?weekStart=${weekStartDate.toISOString().slice(0, 10)}`)
    expect(stopRestoredResponse.status()).toBe(200)
    const stopRestoredRoute = (await stopRestoredResponse.json()).find((candidate: { id: string }) => candidate.id === route.id)
    expect(stopRestoredRoute.stops.map((stop: { order: { id: string } }) => stop.order.id)).toEqual([order.id])
  } finally {
    if (availabilityId) await db.resourceAvailability.delete({ where: { id: availabilityId } }).catch(() => undefined)
    if (routeAvailabilityId) await db.resourceAvailability.delete({ where: { id: routeAvailabilityId } }).catch(() => undefined)
    if (routeStopAvailabilityId) await db.resourceAvailability.delete({ where: { id: routeStopAvailabilityId } }).catch(() => undefined)
    if (routeId) await db.deliveryRoute.delete({ where: { id: routeId } }).catch(() => undefined)
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    if (courierId) await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.$disconnect()
  }
})
