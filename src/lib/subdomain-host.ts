/** @deprecated Use '@/modules/sites/infrastructure/subdomain-host' instead */
export * from '@/modules/sites/infrastructure/subdomain-host'

// Re-export site-url helpers that consumers import from this barrel
export { makeClientSiteHref, getClientSiteBasePath, isLikelySubdomainHost } from '@/modules/sites/infrastructure/site-urls'

/** @deprecated Use makeClientSiteHref instead */
export const n = makeClientSiteHref
