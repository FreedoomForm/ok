export type LatLng = { lat: number; lng: number }

export function extractCoordsFromText(input: string): LatLng | null {
  if (!input) return null

  const text = (() => {
    if (!input.includes('%')) return input
    try {
      return decodeURIComponent(input)
    } catch {
      return input
    }
  })()

  const toLatLng = (latRaw: string, lngRaw: string): LatLng | null => {
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90) return null
    if (lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  // 1) Raw "lat,lng".
  const simpleMatch = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (simpleMatch) return toLatLng(simpleMatch[1], simpleMatch[2])

  // 2) q=lat,lng or ll=lat,lng or query=lat,lng.
  const qMatch = text.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (qMatch) return toLatLng(qMatch[1], qMatch[2])

  // 3) !8m2!3dLAT!4dLNG pairs.
  const pb8Pairs = Array.from(text.matchAll(/!8m2!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g))
  if (pb8Pairs.length > 0) {
    const last = pb8Pairs[pb8Pairs.length - 1]
    const lat = last?.[1]
    const lng = last?.[2]
    if (lat && lng) return toLatLng(lat, lng)
  }

  // 4) !3dLAT!4dLNG pairs.
  const pbPairs = Array.from(text.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g))
  if (pbPairs.length > 0) {
    const last = pbPairs[pbPairs.length - 1]
    const lat = last?.[1]
    const lng = last?.[2]
    if (lat && lng) return toLatLng(lat, lng)
  }

  return null
}

export function formatLatLng(latLng: LatLng) {
  return `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
}

export async function parseGoogleMapsUrl(input: string): Promise<LatLng | null> {
  if (!input) return null
  return extractCoordsFromText(input)
}
