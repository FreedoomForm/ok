import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import type { LatLng, RouteStop, RouteInput, RouteOutput } from '@/modules/admins'

const ORS_BASE_URL = 'https://api.openrouteservice.org'

function isLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false
  const lat = (value as Record<string, unknown>).lat
  const lng = (value as Record<string, unknown>).lng
  return Number.isFinite(lat) && Number.isFinite(lng)
}

function haversineDistance(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

function estimateDurationSecFromPoints(points: LatLng[]): number | null {
  if (!Array.isArray(points) || points.length < 2) return null
  const AVG_SPEED_KMH = 25
  let km = 0
  for (let i = 0; i < points.length - 1; i++) km += haversineDistance(points[i], points[i + 1])
  if (!Number.isFinite(km) || km <= 0) return null
  const sec = (km / AVG_SPEED_KMH) * 3600
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

function nearestNeighborByDistance(start: LatLng | null, stops: RouteStop[]): string[] {
  if (stops.length <= 1) return stops.map((s) => s.orderId)
  const remaining = [...stops]
  const ordered: string[] = []
  let current: LatLng = start ?? { lat: remaining[0].lat, lng: remaining[0].lng }

  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(current, { lat: remaining[i].lat, lng: remaining[i].lng })
      if (d < bestDist) { bestDist = d; bestIndex = i }
    }
    const [picked] = remaining.splice(bestIndex, 1)
    ordered.push(picked.orderId)
    current = { lat: picked.lat, lng: picked.lng }
  }
  return ordered
}

function nearestNeighborByMatrix(matrix: number[][], startIndex: number, candidates: number[]): number[] {
  const left = new Set(candidates)
  const ordered: number[] = []
  let current = startIndex

  while (left.size > 0) {
    let bestIdx: number | null = null
    let bestCost = Number.POSITIVE_INFINITY
    for (const idx of left) {
      const row = matrix[current]
      const cost = Array.isArray(row) ? row[idx] : undefined
      if (typeof cost === 'number' && Number.isFinite(cost) && cost < bestCost) { bestCost = cost; bestIdx = idx }
    }
    if (bestIdx == null) break
    ordered.push(bestIdx)
    left.delete(bestIdx)
    current = bestIdx
  }
  if (left.size > 0) { for (const idx of left) ordered.push(idx) }
  return ordered
}

async function fetchOrsMatrix(apiKey: string, locations: LatLng[]) {
  const res = await fetch(`${ORS_BASE_URL}/v2/matrix/driving-car`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: locations.map((p) => [p.lng, p.lat]), metrics: ['duration'] }),
  })
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(`ORS matrix failed (${res.status}): ${text || 'no details'}`) }
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.durations) ? (data.durations as number[][]) : null
}

async function fetchOrsPolyline(apiKey: string, points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null
  const res = await fetch(`${ORS_BASE_URL}/v2/directions/driving-car/geojson`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: points.map((p) => [p.lng, p.lat]) }),
  })
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(`ORS directions failed (${res.status}): ${text || 'no details'}`) }
  const data = await res.json().catch(() => null)
  const coords = data?.features?.[0]?.geometry?.coordinates
  if (!Array.isArray(coords)) return null
  const polyline: LatLng[] = []
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue
    const lng = Number(c[0]); const lat = Number(c[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) polyline.push({ lat, lng })
  }
  return polyline.length >= 2 ? polyline : null
}

async function processRoute(route: RouteInput, apiKey: string | null): Promise<RouteOutput> {
  const validStops = route.stops.filter(
    (s) => s && typeof s.orderId === 'string' && s.orderId.length > 0 && Number.isFinite(s.lat) && Number.isFinite(s.lng),
  )
  if (validStops.length === 0) {
    return { containerId: route.containerId, orderedOrderIds: [], polyline: [], durationSec: null, source: 'none' }
  }

  const start = isLatLng(route.startPoint) ? route.startPoint : null
  const fallbackOrder = nearestNeighborByDistance(start, validStops)
  const stopById = new Map(validStops.map((s) => [s.orderId, s]))
  const fallbackPoints: LatLng[] = []
  if (start) fallbackPoints.push(start)
  for (const id of fallbackOrder) { const s = stopById.get(id); if (s) fallbackPoints.push({ lat: s.lat, lng: s.lng }) }

  if (!apiKey) {
    return { containerId: route.containerId, orderedOrderIds: fallbackOrder, polyline: fallbackPoints, durationSec: estimateDurationSecFromPoints(fallbackPoints), source: 'fallback' }
  }

  try {
    const matrixLocations = (start ? [start] : []).concat(validStops.map((s) => ({ lat: s.lat, lng: s.lng })))
    let orderedStopIndices: number[] = []
    let durationSecFromMatrix: number | null = null

    if (matrixLocations.length <= 1) {
      orderedStopIndices = [0]
    } else {
      const matrix = await fetchOrsMatrix(apiKey, matrixLocations)
      if (!matrix) throw new Error('Invalid matrix payload')

      const toMatrixIndexSequence = (stopIndices: number[]): number[] => start ? [0, ...stopIndices.map((i) => i + 1)] : stopIndices

      if (start) {
        const candidates = Array.from({ length: validStops.length }, (_, i) => i + 1)
        orderedStopIndices = nearestNeighborByMatrix(matrix, 0, candidates).map((idx) => idx - 1)
      } else {
        const stopCount = validStops.length
        if (stopCount === 1) { orderedStopIndices = [0] }
        else { const candidates = Array.from({ length: stopCount - 1 }, (_, i) => i + 1); orderedStopIndices = [0, ...nearestNeighborByMatrix(matrix, 0, candidates)] }
      }

      const seq = toMatrixIndexSequence(orderedStopIndices)
      if (seq.length >= 2) {
        let total = 0; let ok = true
        for (let i = 0; i < seq.length - 1; i++) {
          const a = seq[i]; const b = seq[i + 1]
          const row = matrix[a]; const cost = Array.isArray(row) ? row[b] : undefined
          if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) { ok = false; break }
          total += cost
        }
        durationSecFromMatrix = ok && Number.isFinite(total) ? total : null
      }
    }

    const orderedStops = orderedStopIndices.map((i) => validStops[i]).filter((s): s is RouteStop => !!s)
    const orderedOrderIds = orderedStops.map((s) => s.orderId)
    const routePoints: LatLng[] = []
    if (start) routePoints.push(start)
    for (const s of orderedStops) routePoints.push({ lat: s.lat, lng: s.lng })
    const roadPolyline = await fetchOrsPolyline(apiKey, routePoints).catch(() => null)

    return { containerId: route.containerId, orderedOrderIds, polyline: roadPolyline ?? routePoints, durationSec: durationSecFromMatrix ?? estimateDurationSecFromPoints(roadPolyline ?? routePoints), source: 'ors' }
  } catch {
    return { containerId: route.containerId, orderedOrderIds: fallbackOrder, polyline: fallbackPoints, durationSec: estimateDurationSecFromPoints(fallbackPoints), source: 'fallback' }
  }
}

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json().catch(() => null)
    const rawRoutes = Array.isArray(body?.routes) ? body.routes : null
    if (!rawRoutes || rawRoutes.length === 0) {
      throw new BadRequestError('routes is required')
    }

    const routes: RouteInput[] = rawRoutes
      .map((r: Record<string, unknown>) => ({
        containerId: typeof r?.containerId === 'string' ? r.containerId : '',
        startPoint: r?.startPoint,
        stops: Array.isArray(r?.stops) ? r.stops : [],
      }))
      .filter((r) => r.containerId.length > 0)

    if (routes.length === 0) {
      throw new BadRequestError('No valid routes provided')
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY || null
    const results = await Promise.all(routes.map((r) => processRoute(r, apiKey)))
    return { data: { routes: results, provider: apiKey ? 'openrouteservice' : 'fallback' } }
  },
})
