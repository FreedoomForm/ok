export type RouteMapPoint = {
  latitude?: number | null
  longitude?: number | null
}

function isCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

export function buildGoogleMapsRouteUrl(points: readonly RouteMapPoint[]): string | null {
  const coordinates = points.flatMap((point) => isCoordinate(point.latitude, point.longitude) ? [`${point.latitude},${point.longitude}`] : [])
  if (coordinates.length === 0) return null
  const params = new URLSearchParams({ api: '1', destination: coordinates.at(-1)! })
  if (coordinates.length > 1) {
    params.set('origin', coordinates[0])
    params.set('waypoints', coordinates.slice(1, -1).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
