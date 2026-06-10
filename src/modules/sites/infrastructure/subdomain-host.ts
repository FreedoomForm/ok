export type SubdomainUrlStyle = 'subdomain-first' | 'project-first'

function stripPort(host: string) {
  return host.split(':')[0].trim().toLowerCase()
}

function parseStyleFromEnv(rootHost?: string): SubdomainUrlStyle {
  const raw = (process.env.NEXT_PUBLIC_SUBDOMAIN_URL_STYLE || '').trim().toLowerCase()
  if (raw === 'project-first') return 'project-first'
  if (raw === 'subdomain-first') return 'subdomain-first'

  const safeRoot = stripPort(rootHost || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
  if (safeRoot.endsWith('.vercel.app')) {
    return 'project-first'
  }

  return 'subdomain-first'
}

export function getSubdomainUrlStyle(rootHost?: string): SubdomainUrlStyle {
  return parseStyleFromEnv(rootHost)
}

export function usesPathRoutingForSubdomains(rootHost?: string) {
  const safeRoot = stripPort(rootHost || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
  if (!safeRoot) return false
  return safeRoot.endsWith('.vercel.app')
}

export function buildSubdomainHost(subdomain: string, rootHost: string | undefined) {
  const normalizedSubdomain = subdomain.trim().toLowerCase()
  const safeRoot = stripPort(rootHost || 'localhost:3000')

  if (!normalizedSubdomain) return safeRoot
  if (usesPathRoutingForSubdomains(safeRoot)) return safeRoot

  const style = getSubdomainUrlStyle(safeRoot)

  if (style === 'project-first' && safeRoot.endsWith('.vercel.app')) {
    const parts = safeRoot.split('.')
    const project = parts[0]
    const suffix = parts.slice(1).join('.')

    if (project && suffix) {
      return `${project}.${normalizedSubdomain}.${suffix}`
    }
  }

  return `${normalizedSubdomain}.${safeRoot}`
}

export function buildSubdomainUrl(subdomain: string, rootHost: string | undefined) {
  const normalizedSubdomain = subdomain.trim().toLowerCase()
  const safeRoot = stripPort(rootHost || 'localhost:3000')

  if (!normalizedSubdomain) {
    return `https://${safeRoot}`
  }

  if (usesPathRoutingForSubdomains(safeRoot)) {
    return `https://${safeRoot}/sites/${normalizedSubdomain}`
  }

  return `https://${buildSubdomainHost(normalizedSubdomain, safeRoot)}`
}

export function extractSubdomainFromHost(hostHeader: string | null, rootHost: string | undefined) {
  if (!hostHeader) return null

  const hostWithoutPort = stripPort(hostHeader)
  const safeRoot = stripPort(rootHost || '')

  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return null
  }

  if (safeRoot && hostWithoutPort === safeRoot) {
    return null
  }

  const style = getSubdomainUrlStyle(safeRoot)

  if (safeRoot && style === 'project-first' && safeRoot.endsWith('.vercel.app')) {
    const parts = safeRoot.split('.')
    const project = parts[0]
    const suffix = parts.slice(1).join('.')
    const prefix = `${project}.`
    const suffixWithDot = `.${suffix}`

    if (project && suffix && hostWithoutPort.startsWith(prefix) && hostWithoutPort.endsWith(suffixWithDot)) {
      const middle = hostWithoutPort.slice(prefix.length, -suffixWithDot.length)
      if (middle && !middle.includes('.')) {
        return middle
      }
    }
  }

  if (safeRoot && hostWithoutPort.endsWith(`.${safeRoot}`)) {
    const suffix = `.${safeRoot}`
    const prefix = hostWithoutPort.slice(0, -suffix.length)
    return prefix || null
  }

  if (hostWithoutPort.endsWith('.localhost')) {
    return hostWithoutPort.replace(/\.localhost$/, '') || null
  }

  return null
}

export function isHostForSubdomain(hostname: string, subdomain: string, rootHost: string | undefined) {
  const hostWithoutPort = stripPort(hostname)
  const normalizedSubdomain = subdomain.trim().toLowerCase()
  if (!hostWithoutPort || !normalizedSubdomain) return false

  const style = getSubdomainUrlStyle(rootHost)
  const safeRoot = stripPort(rootHost || '')

  if (hostWithoutPort === `${normalizedSubdomain}.localhost`) return true

  if (safeRoot) {
    const expected = buildSubdomainHost(normalizedSubdomain, safeRoot)
    if (expected !== safeRoot && hostWithoutPort === expected) return true

    // Be permissive when style changed but old links are still open.
    if (style !== 'project-first' && safeRoot.endsWith('.vercel.app')) {
      const parts = safeRoot.split('.')
      const project = parts[0]
      const suffix = parts.slice(1).join('.')
      if (project && suffix && hostWithoutPort === `${project}.${normalizedSubdomain}.${suffix}`) {
        return true
      }
    }

    if (style !== 'subdomain-first' && hostWithoutPort === `${normalizedSubdomain}.${safeRoot}`) {
      return true
    }
  }

  return hostWithoutPort.startsWith(`${normalizedSubdomain}.`)
}

export function cookieDomainFromRootHost(rootHost: string | undefined) {
  if (!rootHost) return undefined
  const host = stripPort(rootHost)
  if (!host || host === 'localhost') return undefined
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return undefined

  // project-first vercel host pattern is not a suffix domain for cookies.
  if (getSubdomainUrlStyle(host) === 'project-first' && host.endsWith('.vercel.app')) {
    return undefined
  }

  return `.${host}`
}
