import { normalizeWeekStart } from './schedule'

// §10: every calendar week creates a new route record. Disabling a route
// excludes it from automatic future weeks while past records stay untouched.
// The roll-forward runs inside the cron scheduler: enabled routes from earlier
// weeks plan a record for the target week, skipping couriers that already have
// a record with the same name in that week (idempotent under retry).

export type RollForwardSourceRoute = {
  id: string
  name: string
  color: string
  courierId: string
  boundary: { x: number; y: number; width: number; height: number } | null
  weekStart: string
  isActive: boolean
  deletedAt: string | null
}

export type RollForwardPlan = {
  sourceRouteId: string
  courierId: string
  name: string
  color: string
  boundary: { x: number; y: number; width: number; height: number } | null
  weekStart: string
}

function isIsoDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function planWeeklyRouteRollForward(
  routes: readonly RollForwardSourceRoute[],
  targetWeekStart: string,
  existingRoutes: readonly RollForwardSourceRoute[],
): RollForwardPlan[] {
  if (!isIsoDateKey(targetWeekStart)) return []
  const existingKeys = new Set(
    (Array.isArray(existingRoutes) ? existingRoutes : [])
      .filter((route) => route && route.weekStart === targetWeekStart)
      .map((route) => `${route.courierId}:${route.name}`),
  )
  const plans: RollForwardPlan[] = []
  for (const route of Array.isArray(routes) ? routes : []) {
    if (!route || route.isActive !== true || (route.deletedAt !== null && route.deletedAt !== undefined)) continue
    if (!route.id || !route.name || !route.courierId || !isIsoDateKey(route.weekStart)) continue
    if (route.weekStart >= targetWeekStart) continue
    if (existingKeys.has(`${route.courierId}:${route.name}`)) continue
    existingKeys.add(`${route.courierId}:${route.name}`)
    plans.push({
      sourceRouteId: route.id,
      courierId: route.courierId,
      name: route.name,
      color: route.color,
      boundary: route.boundary ?? null,
      weekStart: targetWeekStart,
    })
  }
  return plans
}

export type RollForwardOrder = {
  id: string
  courierId: string | null
  deliveryDate: string | Date | null
  customerId: string
}

export function selectRollForwardStopCandidates(
  orders: readonly RollForwardOrder[],
  courierId: string,
  targetWeekStart: string,
  unavailableOrderIds: ReadonlySet<string>,
  takenOrderIds: ReadonlySet<string>,
): string[] {
  const weekStart = normalizeWeekStart(targetWeekStart)
  if (!weekStart) return []
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const candidates: string[] = []
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || typeof order.id !== 'string') continue
    if (takenOrderIds.has(order.id) || unavailableOrderIds.has(order.id)) continue
    if (order.courierId !== courierId) continue
    if (!order.deliveryDate) continue
    const date = order.deliveryDate instanceof Date ? order.deliveryDate : new Date(order.deliveryDate)
    if (Number.isNaN(date.getTime())) continue
    if (date < weekStart || date >= weekEnd) continue
    candidates.push(order.id)
  }
  return candidates
}
