import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('route stops stay unique per route for order links and positions', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-route-stops-${suffix}`
  const phone = `+1888${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  let routeId: string | undefined
  const orderIds: string[] = []

  try {
    const owner = await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Route Stops Admin', role: 'SUPER_ADMIN', phone } })
    const customer = await db.customer.create({ data: { name: 'Route Stops Customer', phone, address: 'Route Stops Address', createdBy: adminId, autoOrdersEnabled: false } })
    customerId = customer.id

    for (let index = 0; index < 2; index += 1) {
      const order = await db.order.create({
        data: {
          orderNumber: Number(`${Date.now()}`.slice(-9)) + index,
          customerId: customer.id,
          deliveryAddress: 'Route Stops Address',
          deliveryDate: new Date('2026-09-01T00:00:00.000Z'),
        },
      })
      orderIds.push(order.id)
    }

    const route = await db.deliveryRoute.create({
      data: {
        name: `Browser Stops Route ${suffix}`,
        color: '#2563eb',
        weekStart: new Date('2026-08-31T00:00:00.000Z'),
        ownerId: owner.id,
        courierId: owner.id,
        stops: {
          create: [
            { orderId: orderIds[0], position: 1 },
            { orderId: orderIds[1], position: 2 },
          ],
        },
      },
    })
    routeId = route.id

    // Duplicate order inside the same route is rejected by the schema constraint.
    await assert.rejects(
      db.deliveryRouteStop.create({ data: { routeId: route.id, orderId: orderIds[0], position: 3 } }),
      (error: unknown) => error instanceof Object && 'code' in error && (error as { code?: string }).code === 'P2002',
    )

    // Duplicate position inside the same route is rejected as well.
    const thirdOrder = await db.order.create({ data: { orderNumber: Number(`${Date.now()}`.slice(-9)) + 7, customerId: customer.id, deliveryAddress: 'Route Stops Address', deliveryDate: new Date('2026-09-01T00:00:00.000Z') } })
    await assert.rejects(
      db.deliveryRouteStop.create({ data: { routeId: route.id, orderId: thirdOrder.id, position: 1 } }),
      (error: unknown) => error instanceof Object && 'code' in error && (error as { code?: string }).code === 'P2002',
    )

    const stops = await db.deliveryRouteStop.findMany({ where: { routeId: route.id }, orderBy: { position: 'asc' }, select: { orderId: true, position: true } })
    assert.equal(stops.length, 2)
    assert.deepEqual(stops.map((stop) => stop.position), [1, 2])
  } finally {
    await Promise.allSettled([
      ...(routeId ? [db.deliveryRoute.delete({ where: { id: routeId } })] : []),
      db.order.deleteMany({ where: { customerId } }),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      db.actionLog.deleteMany({ where: { adminId } }),
      db.admin.delete({ where: { id: adminId } }).catch(() => undefined),
    ])
    await db.$disconnect()
  }
})
