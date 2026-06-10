import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'

interface OrderLocation {
  id: string
  address: string
  latitude?: number | null
  longitude?: number | null
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function optimizeRouteNearestNeighbor(
  startPoint: { lat: number; lng: number },
  locations: Array<{ id: string; lat: number; lng: number; address: string }>,
): Array<{ id: string; lat: number; lng: number; address: string }> {
  if (locations.length === 0) return []
  if (locations.length === 1) return [locations[0]]

  const visited = new Set<string>()
  const route: typeof locations = []
  let currentPoint = startPoint

  while (visited.size < locations.length) {
    let nearestLoc: typeof locations[0] | null = null
    let nearestDistance = Infinity

    for (const loc of locations) {
      if (visited.has(loc.id)) continue
      const distance = haversineDistance(currentPoint.lat, currentPoint.lng, loc.lat, loc.lng)
      if (distance < nearestDistance) { nearestDistance = distance; nearestLoc = loc }
    }

    if (nearestLoc) {
      visited.add(nearestLoc.id)
      route.push(nearestLoc)
      currentPoint = { lat: nearestLoc.lat, lng: nearestLoc.lng }
    }
  }
  return route
}

function extractCoordinatesFromInput(input: string): { lat: number; lng: number } | null {
  if (!input) return null
  const atMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  const qMatch = input.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  const simpleMatch = input.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/)
  if (simpleMatch) return { lat: parseFloat(simpleMatch[1]), lng: parseFloat(simpleMatch[2]) }
  return null
}

function buildGoogleMapsUrl(
  startPoint: { lat: number; lng: number } | null,
  waypoints: Array<{ lat?: number; lng?: number; address: string }>,
  unoptimizedAddresses: string[] = [],
): string {
  const parts: string[] = []
  if (startPoint) parts.push(`${startPoint.lat},${startPoint.lng}`)
  waypoints.forEach((wp) => {
    if (wp.lat && wp.lng) parts.push(`${wp.lat},${wp.lng}`)
    else parts.push(encodeURIComponent(wp.address))
  })
  unoptimizedAddresses.forEach((addr) => parts.push(encodeURIComponent(addr)))
  if (parts.length === 0) return 'https://www.google.com/maps'
  return `https://www.google.com/maps/dir/${parts.join('/')}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export const POST = createApiRoute({
  handler: async ({ request }) => {
    const body = await request.json()
    const { orders, startPoint } = body

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      throw new BadRequestError('No orders provided')
    }

    const processedOrders = (orders as OrderLocation[]).map((o) => {
      if (o.latitude != null && o.longitude != null) return { ...o, hasCoords: true }
      const extracted = extractCoordinatesFromInput(o.address)
      if (extracted) return { ...o, latitude: extracted.lat, longitude: extracted.lng, hasCoords: true }
      return { ...o, hasCoords: false }
    })

    const validOrders = processedOrders.filter((o: Record<string, unknown>) => o.hasCoords)
    const dateOrders = processedOrders.filter((o: Record<string, unknown>) => !o.hasCoords)
    const start = startPoint || { lat: 41.2995, lng: 69.2401 }

    const locations = validOrders.map((o: Record<string, unknown>) => ({
      id: o.id as string,
      lat: o.latitude as number,
      lng: o.longitude as number,
      address: o.address as string,
    }))

    const optimizedLocations = optimizeRouteNearestNeighbor(start, locations)

    let totalDistance = 0
    let currentPoint = start
    for (const loc of optimizedLocations) {
      totalDistance += haversineDistance(currentPoint.lat, currentPoint.lng, loc.lat, loc.lng)
      currentPoint = { lat: loc.lat, lng: loc.lng }
    }

    const googleMapsUrl = buildGoogleMapsUrl(
      start,
      optimizedLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng, address: loc.address })),
      dateOrders.map((o: Record<string, unknown>) => o.address as string),
    )

    const allOrderedIds = [
      ...optimizedLocations.map((loc) => loc.id),
      ...dateOrders.map((o: Record<string, unknown>) => o.id as string),
    ]

    const estimatedDuration = (totalDistance / 25) * 60

    return {
      data: {
        orderedIds: allOrderedIds,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalDuration: Math.round(estimatedDuration),
        formattedDistance: `${Math.round(totalDistance * 10) / 10} km`,
        formattedDuration: formatDuration(estimatedDuration),
        googleMapsUrl,
        waypoints: [
          ...optimizedLocations.map((loc) => ({ orderId: loc.id, address: loc.address, coords: { lat: loc.lat, lng: loc.lng } })),
          ...dateOrders.map((o: Record<string, unknown>) => ({ orderId: o.id as string, address: o.address as string, coords: undefined })),
        ],
      },
    }
  },
})

export const GET = createApiRoute({
  handler: async () => {
    return {
      data: {
        service: 'Route Optimization API',
        description: 'Optimizes delivery order using nearest neighbor algorithm and opens route in Google Maps',
        supportedMethods: ['POST'],
        parameters: { orders: 'Array of orders with id, address, latitude, longitude', startPoint: 'Optional { lat, lng } for starting point' },
        features: ['No API key required', 'Haversine distance calculation', 'Nearest neighbor optimization', 'Google Maps URL generation'],
      },
    }
  },
})
