import type { PrismaClient } from '@prisma/client'

import { getDisabledResourceDates } from '@/lib/resource-availability'
import { normalizeWeekStart } from '@/lib/routes/schedule'
import { planWeeklyRouteRollForward, selectRollForwardStopCandidates, type RollForwardSourceRoute } from '@/lib/routes/weekly-rollforward'

// §10: every calendar week creates a new route record. Enabled routes from
// earlier weeks roll into next week inside the cron scheduler — idempotent by
// (courier, name) within the target week, past records stay untouched, and
// stop candidates join only through valid courier/client availability.
export async function rollForwardWeeklyRouteRecords(db: PrismaClient): Promise<number> {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const targetMonday = normalizeWeekStart(nextWeek)
  if (!targetMonday) return 0
  const weekEnd = new Date(targetMonday)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [activeRoutes, existingWeekRecords] = await Promise.all([
    db.deliveryRoute.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, color: true, courierId: true, boundary: true, weekStart: true, isActive: true, deletedAt: true },
    }),
    db.deliveryRoute.findMany({
      where: { weekStart: targetMonday },
      select: { name: true, courierId: true, weekStart: true },
    }),
  ])

  const plans = planWeeklyRouteRollForward(
    activeRoutes.map((route) => ({
      ...route,
      weekStart: route.weekStart instanceof Date ? route.weekStart.toISOString().slice(0, 10) : String(route.weekStart),
      deletedAt: route.deletedAt ? route.deletedAt.toISOString() : null,
      boundary: typeof route.boundary === 'object' && route.boundary !== null ? route.boundary as { x: number; y: number; width: number; height: number } : null,
    })) as RollForwardSourceRoute[],
    targetMonday.toISOString().slice(0, 10),
    existingWeekRecords.map((route) => ({
      id: '',
      name: route.name,
      color: '#000000',
      courierId: route.courierId,
      boundary: null,
      weekStart: route.weekStart instanceof Date ? route.weekStart.toISOString().slice(0, 10) : String(route.weekStart),
      isActive: true,
      deletedAt: null,
    })),
  )
  if (plans.length === 0) return 0

  const courierIds = [...new Set(plans.map((plan) => plan.courierId))]
  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      orderStatus: { not: 'PAUSED' },
      deliveryDate: { gte: targetMonday, lt: weekEnd },
      courierId: { in: courierIds },
    },
    select: { id: true, courierId: true, customerId: true, deliveryDate: true },
  })
  const [clientDisabledDates, courierDisabledDates, takenStops] = await Promise.all([
    getDisabledResourceDates('CLIENT', [...new Set(orders.map((order) => order.customerId))], targetMonday, weekEnd),
    getDisabledResourceDates('COURIER', courierIds, targetMonday, weekEnd),
    db.deliveryRouteStop.findMany({ where: { route: { weekStart: targetMonday } }, select: { orderId: true } }),
  ])
  const takenOrderIds = new Set<string>(takenStops.map((stop) => stop.orderId))

  const courierOwners = await db.admin.findMany({
    where: { id: { in: courierIds } },
    select: { id: true, createdBy: true },
  })
  const ownerByCourier = new Map(courierOwners.map((courier) => [courier.id, courier.createdBy]))
  const fallbackOwner = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })

  let created = 0
  for (const plan of plans) {
    const unavailableOrderIds = new Set<string>()
    for (const order of orders) {
      if (!order.deliveryDate) continue
      const dateKey = order.deliveryDate.toISOString().slice(0, 10)
      if (clientDisabledDates.get(order.customerId)?.has(dateKey)) unavailableOrderIds.add(order.id)
      if (courierDisabledDates.get(plan.courierId)?.has(dateKey)) unavailableOrderIds.add(order.id)
    }
    const candidates = selectRollForwardStopCandidates(orders, plan.courierId, plan.weekStart, unavailableOrderIds, takenOrderIds)
    const ownerId = ownerByCourier.get(plan.courierId) ?? fallbackOwner?.id
    if (!ownerId) return created
    try {
      await db.deliveryRoute.create({
        data: {
          name: plan.name,
          color: plan.color,
          weekStart: new Date(`${plan.weekStart}T00:00:00.000Z`),
          ownerId,
          courierId: plan.courierId,
          isActive: true,
          boundary: plan.boundary ?? undefined,
          stops: { create: candidates.map((orderId, position) => ({ orderId, position })) },
        },
      })
      created += 1
      for (const candidate of candidates) takenOrderIds.add(candidate)
    } catch (error) {
      // P2002 (courier, weekStart, name) races mean the record already rolled —
      // skip silently, the outcome is idempotent.
      console.error('Failed to roll weekly route record forward:', error)
    }
  }
  return created
}
