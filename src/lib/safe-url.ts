const TRUSTED_MAP_HOSTS = new Set([
  'goo.gl',
  'maps.app.goo.gl',
  'maps.google.com',
  'google.com',
  'www.google.com',
])

export function parseTrustedMapUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password || url.port) return null
    if (!TRUSTED_MAP_HOSTS.has(url.hostname.toLowerCase())) return null
    return url
  } catch {
    return null
  }
}
