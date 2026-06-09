import { isHostForSubdomain } from '@/lib/subdomain-host'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN

export function isLikelySubdomainHost(hostname: string, subdomain: string) {
  return isHostForSubdomain(hostname, subdomain, ROOT_DOMAIN)
}

export function getClientSiteBasePath(subdomain: string) {
  if (typeof window === 'undefined') return `/sites/${subdomain}`
  const hostname = window.location.hostname || ''
  return isLikelySubdomainHost(hostname, subdomain) ? '' : `/sites/${subdomain}`
}

function normalizePath(pathname: string) {
  if (!pathname) return ''
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

export function makeClientSiteHref(subdomain: string, pathname: string) {
  const basePath = getClientSiteBasePath(subdomain)
  const normalized = normalizePath(pathname)

  if (!basePath) {
    return normalized || '/'
  }

  if (!normalized) {
    return basePath
  }

  return `${basePath}${normalized}`
}
