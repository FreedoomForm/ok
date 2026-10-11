import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'

import { rollForwardWeeklyRouteRecords } from '../src/lib/routes/weekly-rollforward.server'
import { assignOrderToMatchingRoute } from '../src/lib/routes/auto-assign'
import { normalizeWeekStart } from '../src/lib/routes/schedule'

// C9 / R47: the roll-forward must not extend disabled routes, and a new order
// inside an enabled route polygon joins that route automatically.

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

function mondayOffset(offsetWeeks: number): Date {
  const base = normalizeWeekStart(new Date()) ?? new Date()
  base.setDate(base.getDate() + offsetWeeks * 7)
  return base
}

test('roll-forward skips disabled routes and rolls enabled ones', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const nonce = `${process.pid}${Date.now()}`
  let courierId: string | undefined
  let ownerId: string | undefined

  try {
    const owner = await db.admin.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })
    ownerId = owner.id
    const courier = await db.admin.create({
      data: { email: `c9-roll-${nonce}@example.test`, name: 'C9 Roll Courier', role: 'COURIER', isActive: true, createdBy: owner.id },
      select: { id: true },
    })
    courierId = courier.id
    const pastWeek = mondayOffset(-1)
    const polygon = { kind: 'geo-polygon', points: [
      { lat: 41.3, lng: 69.24 }, { lat: 41.3, lng: 69.3 }, { lat: 41.26, lng: 69.3 }, { lat: 41.26, lng: 69.24 },
    ] }

    await db.deliveryRoute.create({ data: { name: `C9 Inactive ${nonce}`, color: '#2563eb', weekStart: pastWeek, ownerId: owner.id, courierId: courier.id, isActive: false, boundary: polygon } })
    await db.deliveryRoute.create({ data: { name: `C9 Active ${nonce}`, color: '#059669', weekStart: pastWeek, ownerId: owner.id, courierId: courier.id, isActive: true, boundary: polygon } })

    await rollForwardWeeklyRouteRecords(db)

    const targetWeek = mondayOffset(1)
    const rolled = await db.deliveryRoute.findMany({ where: { courierId: courier.id, weekStart: targetWeek }, select: { name: true, isActive: true, boundary: true } })
    assert.equal(rolled.length, 1, 'only the enabled route rolled forward')
    assert.equal(rolled[0].name, `C9 Active ${nonce}`)
    assert.equal(rolled[0].isActive, true)
  } finally {
    if (courierId) {
      await db.deliveryRouteStop.deleteMany({ where: { route: { courierId } } }).catch(() => undefined)
      await db.deliveryRoute.deleteMany({ where: { courierId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})

test('a new order inside an enabled route polygon joins the route (auto-assign)', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const nonce = `${process.pid}${Date.now()}`
  let courierId: string | undefined
  let orderId: string | undefined
  let customerId: string | undefined

  try {
    const owner = await db.admin.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })
    const courier = await db.admin.create({
      data: { email: `c9-assign-${nonce}@example.test`, name: 'C9 Assign Courier', role: 'COURIER', isActive: true, createdBy: owner.id },
      select: { id: true },
    })
    courierId = courier.id
    const customer = await db.customer.create({
      data: { name: `C9 Assign Client ${nonce}`, phone: `+99890${nonce.slice(-7)}`, address: 'Tashkent', createdBy: owner.id, latitude: 41.28, longitude: 69.27 },
      select: { id: true },
    })
    customerId = customer.id
    const thisWeek = mondayOffset(0)
    const polygon = { kind: 'geo-polygon', points: [
      { lat: 41.3, lng: 69.24 }, { lat: 41.3, lng: 69.3 }, { lat: 41.26, lng: 69.3 }, { lat: 41.26, lng: 69.24 },
    ] }
    await db.deliveryRoute.create({ data: { name: `C9 Polygon ${nonce}`, color: '#2563eb', weekStart: thisWeek, ownerId: owner.id, courierId: courier.id, isActive: true, boundary: polygon } })

    const order = await db.order.create({
      data: {
        orderNumber: 970000000 + Number(nonce.slice(-6)),
        customerId: customer.id,
        adminId: owner.id,
        deliveryAddress: 'Tashkent, inside polygon',
        deliveryDate: new Date(),
        latitude: 41.28,
        longitude: 69.27,
        quantity: 1,
      },
      select: { id: true },
    })
    orderId = order.id

    const outcome = await assignOrderToMatchingRoute(db, {
      orderId: order.id,
      deliveryDate: new Date(),
      latitude: 41.28,
      longitude: 69.27,
    })
    assert.equal(outcome.routeId !== null, true, 'order joined a route')
    assert.equal(outcome.courierId, courier.id)

    const stop = await db.deliveryRouteStop.findFirst({ where: { orderId: order.id }, select: { position: true, routeId: true } })
    assert.ok(stop, 'stop created')
    assert.equal(stop.routeId, outcome.routeId)

    const updatedOrder = await db.order.findUnique({ where: { id: order.id }, select: { courierId: true } })
    assert.equal(updatedOrder?.courierId, courier.id)
  } finally {
    if (orderId) await db.deliveryRouteStop.deleteMany({ where: { orderId } }).catch(() => undefined)
    if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    if (courierId) {
      await db.deliveryRouteStop.deleteMany({ where: { route: { courierId } } }).catch(() => undefined)
      await db.deliveryRoute.deleteMany({ where: { courierId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    }
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.$disconnect()
  }
})
