export const CANONICAL_TABS = [
  'orders',
  'clients',
  'admins',
  'bin',
  'statistics',
  'history',
  'warehouse',
  'finance',
  'interface',
] as const

export type CanonicalTabId = (typeof CANONICAL_TABS)[number]

export function mapLegacyAllowedTabId(tab: string): string {
  if (tab === 'settings') return 'interface'
  return tab
}

export function deriveVisibleTabs(allowedTabs: string[] | null | undefined): string[] {
  const canonicalTabs = CANONICAL_TABS as unknown as string[]
  const canonical = new Set<string>(canonicalTabs)

  if (!Array.isArray(allowedTabs)) {
    return [...canonicalTabs]
  }

  const safeAllowedTabs = allowedTabs.filter((tab): tab is string => typeof tab === 'string')
  const normalized = safeAllowedTabs.map(mapLegacyAllowedTabId).filter((tab) => canonical.has(tab))

  return safeAllowedTabs.length > 0 ? normalized : []
}
