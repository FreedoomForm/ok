// §10: the routes secondary rail shows one line per courier with their color
// and expandable route records. Route rows themselves stay selectable for the
// universal commands, so the grouping is a pure view transform over the loaded
// week's routes: couriers sorted by name, each courier's routes sorted by
// week (newest first, weekly route records), color taken deterministically
// from the newest record.

export type RouteRailRoute = {
  id: string
  name: string
  color: string | null
  weekStart: string
  stopCount: number
  isActive: boolean
  deletedAt: boolean
}

export type RouteRailCourierGroup = {
  courierId: string
  courierName: string
  color: string | null
  routes: RouteRailRoute[]
  totalStops: number
}

type RailRouteInput = {
  id?: unknown
  name?: unknown
  color?: unknown
  weekStart?: unknown
  isActive?: unknown
  deletedAt?: unknown
  stops?: unknown
  courier?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function groupRoutesByCourier(routes: readonly RailRouteInput[] | undefined | null): RouteRailCourierGroup[] {
  if (!Array.isArray(routes)) return []
  const byCourier = new Map<string, RouteRailCourierGroup>()
  for (const raw of routes) {
    if (!isRecord(raw)) continue
    const courier = isRecord(raw.courier) ? raw.courier : null
    const courierId = asString(courier?.id)
    const courierName = asString(courier?.name)
    const id = asString(raw.id)
    if (!courierId || !courierName || !id) continue
    let group = byCourier.get(courierId)
    if (!group) {
      group = { courierId, courierName, color: null, routes: [], totalStops: 0 }
      byCourier.set(courierId, group)
    }
    group.routes.push({
      id,
      name: asString(raw.name) ?? id,
      color: asString(raw.color),
      weekStart: asString(raw.weekStart) ?? '',
      stopCount: Array.isArray(raw.stops) ? raw.stops.length : 0,
      isActive: raw.isActive === true,
      deletedAt: typeof raw.deletedAt === 'string' && raw.deletedAt.length > 0,
    })
    group.totalStops += Array.isArray(raw.stops) ? raw.stops.length : 0
  }
  const groups = [...byCourier.values()]
  for (const group of groups) {
    group.routes.sort((left, right) => {
      if (left.weekStart !== right.weekStart) return left.weekStart < right.weekStart ? 1 : -1
      return left.name.localeCompare(right.name)
    })
    group.color = group.routes[0]?.color ?? null
  }
  groups.sort((left, right) => left.courierName.localeCompare(right.courierName))
  return groups
}
