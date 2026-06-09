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

  // 3b) !8m2!2dLNG!3dLAT (alternate order).
  const pb8PairsAlt = Array.from(text.matchAll(/!8m2!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/g))
  if (pb8PairsAlt.length > 0) {
    const last = pb8PairsAlt[pb8PairsAlt.length - 1]
    const lng = last?.[1]
    const lat = last?.[2]
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

  // 4b) !2dLNG!3dLAT (alternate order).
  const pbPairsAlt = Array.from(text.matchAll(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/g))
  if (pbPairsAlt.length > 0) {
    const last = pbPairsAlt[pbPairsAlt.length - 1]
    const lng = last?.[1]
    const lat = last?.[2]
    if (lat && lng) return toLatLng(lat, lng)
  }

  // 5) /search/lat,lng.
  const searchMatch = text.match(/search\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (searchMatch) return toLatLng(searchMatch[1], searchMatch[2])

  // 6) @lat,lng (often viewport center).
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (atMatch) return toLatLng(atMatch[1], atMatch[2])

  return null
}

export function isShortGoogleMapsUrl(url: string) {
  return typeof url === 'string' && (url.includes('goo.gl') || url.includes('maps.app.goo.gl'))
}

export function extractShortGoogleMapsUrl(input: string): string | null {
  if (!input) return null
  const match = input.match(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl)\/[^\s)]+/i)
  return match ? match[0] : null
}

export function formatLatLng(latLng: LatLng) {
  return `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
}

export function extractAnyUrl(input: string): string | null {
  if (!input) return null
  const match = input.match(/https?:\/\/[^\s)]+/i)
  return match ? match[0] : null
}

export function isGoogleMapsLikeUrl(url: string): boolean {
  if (!url) return false
  const normalized = url.toLowerCase()
  return (
    normalized.includes('google.com/maps') ||
    normalized.includes('maps.google.com') ||
    normalized.includes('maps.app.goo.gl') ||
    normalized.includes('goo.gl/maps')
  )
}

/**
 * Expand a short `goo.gl` / `maps.app.goo.gl` URL via the server-side API.
 * Returns expanded URL on success or `null` on failure.
 */
export async function expandShortMapsUrl(shortUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/admin/expand-url?url=${encodeURIComponent(shortUrl)}`)
    if (!response.ok) return null
    const data = await response.json().catch(() => null)
    return data && typeof data.expandedUrl === 'string' ? data.expandedUrl : null
  } catch {
    return null
  }
}

/**
 * Parse Google Maps-like input (short link, full URL, raw coords)
 * and return `LatLng` on success.
 */
export async function parseGoogleMapsUrl(input: string): Promise<LatLng | null> {
  if (!input) return null

  let finalUrl = input
  const inlineUrl = extractAnyUrl(input)
  const candidateUrl = inlineUrl && isGoogleMapsLikeUrl(inlineUrl) ? inlineUrl : input

  if (isShortGoogleMapsUrl(candidateUrl)) {
    const expanded = await expandShortMapsUrl(candidateUrl)
    if (expanded) finalUrl = expanded
  } else {
    finalUrl = candidateUrl
  }

  return (
    extractCoordsFromText(finalUrl) ??
    extractCoordsFromText(candidateUrl) ??
    extractCoordsFromText(input)
  )
}
