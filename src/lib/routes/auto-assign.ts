import type { PrismaClient } from '@prisma/client'

import { normalizeWeekStart } from './schedule'
import { isPointInPolygon, parseRouteBoundary, type GeoPoint } from './geo-polygon'

// C9 / R47: a new order whose delivery point falls inside the polygon of an
// ENABLED route of the same week joins that route — a stop is appended and
// the courier falls back to the route's courier when the order has none.

export type AutoAssignInput = {
  orderId: string
  deliveryDate: Date | string | null
  latitude?: number | null
  longitude?: number | null
}

export type AutoAssignOutcome = {
  routeId: string | null
  courierId: string | null
}

export async function assignOrderToMatchingRoute(
  db: PrismaClient,
  input: AutoAssignInput,
): Promise<AutoAssignOutcome> {
  const empty: AutoAssignOutcome = { routeId: null, courierId: null }
  if (!input?.orderId) return empty
  if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') return empty
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return empty
  const deliveryDate = input.deliveryDate instanceof Date ? input.deliveryDate : input.deliveryDate ? new Date(input.deliveryDate) : null
  if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) return empty
  const weekStart = normalizeWeekStart(deliveryDate)
  if (!weekStart) return empty

  const point: GeoPoint = { lat: input.latitude, lng: input.longitude }
  const routes = await db.deliveryRoute.findMany({
    where: { weekStart, isActive: true, deletedAt: null },
    select: { id: true, courierId: true, boundary: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const route of routes) {
    const polygon = parseRouteBoundary(route.boundary)
    if (!polygon) continue
    if (!isPointInPolygon(point, polygon.points)) continue
    const lastStop = await db.deliveryRouteStop.findFirst({
      where: { routeId: route.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const nextPosition = (lastStop?.position ?? -1) + 1
    const existing = await db.deliveryRouteStop.findUnique({ where: { routeId_orderId: { routeId: route.id, orderId: input.orderId } }, select: { id: true } })
    if (existing) return { routeId: route.id, courierId: route.courierId }
    try {
      await db.$transaction(async (tx) => {
        await tx.deliveryRouteStop.create({ data: { routeId: route.id, orderId: input.orderId, position: nextPosition } })
        await tx.order.update({ where: { id: input.orderId }, data: { courierId: route.courierId } })
      })
      return { routeId: route.id, courierId: route.courierId }
    } catch {
      // Unique-race or missing order — the stop pipeline elsewhere owns the outcome.
      return empty
    }
  }
  return empty
}
