import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

type LatLng = { lat: number; lng: number }

type RouteStop = {
  orderId: string
  lat: number
  lng: number
}

type RouteInput = {
  containerId: string
  startPoint?: LatLng | null
  stops: RouteStop[]
}

type RouteOutput = {
  containerId: string
  polyline: LatLng[]
  durationSec: number | null
  source: 'ors' | 'fallback' | 'none'
}

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

async function fetchOrsDirections(apiKey: string, points: LatLng[]) {
  const res = await fetch(`${ORS_BASE_URL}/v2/directions/driving-car/geojson`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: points.map((p) => [p.lng, p.lat]),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ORS directions failed (${res.status}): ${text || 'no details'}`)
  }

  const data = await res.json().catch(() => null)
  const coords = data?.features?.[0]?.geometry?.coordinates
  const duration = data?.features?.[0]?.properties?.summary?.duration
  const durationSec = typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : null

  if (!Array.isArray(coords)) return { polyline: null, durationSec }

  const polyline: LatLng[] = []
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue
    const lng = Number(c[0])
    const lat = Number(c[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) polyline.push({ lat, lng })
  }

  return { polyline: polyline.length >= 2 ? polyline : null, durationSec }
}

async function processRoute(route: RouteInput, apiKey: string | null): Promise<RouteOutput> {
  const validStops = route.stops.filter(
    (s) =>
      s &&
      typeof s.orderId === 'string' &&
      s.orderId.length > 0 &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng)
  )

  const start = isLatLng(route.startPoint) ? route.startPoint : null

  const points: LatLng[] = []
  if (start) points.push(start)
  for (const s of validStops) points.push({ lat: s.lat, lng: s.lng })

  if (points.length < 2) {
    return { containerId: route.containerId, polyline: [], durationSec: null, source: 'none' }
  }

  if (!apiKey) {
    return {
      containerId: route.containerId,
      polyline: points,
      durationSec: estimateDurationSecFromPoints(points),
      source: 'fallback',
    }
  }

  try {
    const { polyline, durationSec } = await fetchOrsDirections(apiKey, points)
    const finalPolyline = polyline ?? points
    return {
      containerId: route.containerId,
      polyline: finalPolyline,
      durationSec: durationSec ?? estimateDurationSecFromPoints(finalPolyline),
      source: 'ors',
    }
  } catch {
    return {
      containerId: route.containerId,
      polyline: points,
      durationSec: estimateDurationSecFromPoints(points),
      source: 'fallback',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const rawRoutes = Array.isArray(body?.routes) ? body.routes : null
    if (!rawRoutes || rawRoutes.length === 0) {
      return NextResponse.json({ error: 'routes is required' }, { status: 400 })
    }

    const routes: RouteInput[] = rawRoutes
      .map((r: unknown) => {
        const obj = r && typeof r === 'object' ? (r as Record<string, unknown>) : null
        return {
          containerId: typeof obj?.containerId === 'string' ? obj.containerId : '',
          startPoint: obj?.startPoint as unknown,
          stops: Array.isArray(obj?.stops) ? (obj?.stops as unknown[]) : [],
        }
      })
      .filter((r) => r.containerId.length > 0)

    if (routes.length === 0) {
      return NextResponse.json({ error: 'No valid routes provided' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY || null
    const results = await Promise.all(routes.map((r) => processRoute(r, apiKey)))
    return NextResponse.json({ routes: results, provider: apiKey ? 'openrouteservice' : 'fallback' })
  } catch (error) {
    console.error('Dispatch ORS polyline error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
