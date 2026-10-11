// C9 / R40, R43, R47: real-geo route boundaries. A route boundary is a GeoJSON
// Polygon (array of lat/lng vertices, ≥ 3); the legacy schematic panel rects
// (x/y/width/height with values in 0..1) are detected and ignored on read.

export type GeoPoint = { lat: number; lng: number }

export type RouteGeoBoundary = {
  kind: 'geo-polygon'
  points: GeoPoint[]
}

export type LegacyPanelBoundary = { x: number; y: number; width: number; height: number }

const TASHKENT_BOUNDS = { minLat: 40.8, maxLat: 41.7, minLng: 68.6, maxLng: 70.0 }

export function isLegacyPanelBoundary(value: unknown): value is LegacyPanelBoundary {
  if (!value || typeof value !== 'object') return false
  const raw = value as Record<string, unknown>
  return (
    typeof raw.x === 'number' && Number.isFinite(raw.x) &&
    typeof raw.y === 'number' && Number.isFinite(raw.y) &&
    typeof raw.width === 'number' && Number.isFinite(raw.width) &&
    typeof raw.height === 'number' && Number.isFinite(raw.height)
  )
}

export function isRouteGeoBoundary(value: unknown): value is RouteGeoBoundary {
  if (!value || typeof value !== 'object') return false
  const raw = value as Record<string, unknown>
  if (raw.kind !== 'geo-polygon') return false
  const points = raw.points
  if (!Array.isArray(points) || points.length < 3) return false
  return points.every((point) => {
    if (!point || typeof point !== 'object') return false
    const lat = (point as Record<string, unknown>).lat
    const lng = (point as Record<string, unknown>).lng
    return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
  })
}

/** Parses a stored boundary JSON: geo polygons pass, legacy panel rects are ignored. */
export function parseRouteBoundary(value: unknown): RouteGeoBoundary | null {
  if (isRouteGeoBoundary(value)) return value
  // Legacy schematic rectangles (panel-relative, sums ≤ 1) are not geo data.
  if (isLegacyPanelBoundary(value)) return null
  return null
}

/** Validates a client-supplied polygon: ≥ 3 finite vertices inside the Tashkent window. */
export function normalizeRouteGeoBoundary(value: unknown): RouteGeoBoundary | null {
  if (!isRouteGeoBoundary(value)) return null
  const points = (value as RouteGeoBoundary).points.map((point) => ({ lat: point.lat, lng: point.lng }))
  const insideWindow = points.every((point) =>
    point.lat >= TASHKENT_BOUNDS.minLat && point.lat <= TASHKENT_BOUNDS.maxLat &&
    point.lng >= TASHKENT_BOUNDS.minLng && point.lng <= TASHKENT_BOUNDS.maxLng)
  if (!insideWindow) return null
  return { kind: 'geo-polygon', points }
}

/** Inclusive ray-casting point-in-polygon test over lat/lng vertices. */
export function isPointInPolygon(point: GeoPoint, polygon: readonly GeoPoint[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    const intersects = (yi > point.lat) !== (yj > point.lat) &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export type GeoPointEntry = {
  id?: string
  position: GeoPoint
}

/** Resolves the order ids captured by a polygon, preserving the caller's entry order. */
export function orderIdsInsidePolygon(entries: readonly GeoPointEntry[], polygon: readonly GeoPoint[]): string[] {
  const captured: string[] = []
  for (const entry of entries) {
    if (typeof entry.id !== 'string' || entry.id === '') continue
    if (!isPointInPolygon(entry.position, polygon)) continue
    captured.push(entry.id)
  }
  return captured
}

/** R46: the default routes period — today through the next Monday, inclusive. */
export function nextMondayInclusive(from: Date): Date {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7
  date.setDate(date.getDate() + daysUntilMonday)
  return date
}

export function formatPeriodLabel(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })
  return `${fmt.format(from)} → ${fmt.format(to)}`
}
