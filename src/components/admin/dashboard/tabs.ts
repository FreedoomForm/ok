import type { WorkspaceResourcePage } from './shared/workspace-state'

export const RESOURCE_PAGE_REGISTRY: readonly { id: WorkspaceResourcePage; legacyTabs: readonly string[] }[] = [
  { id: 'chat', legacyTabs: ['chat', 'interface', 'settings'] },
  { id: 'settings', legacyTabs: ['interface', 'settings'] },
  { id: 'ingredients', legacyTabs: ['warehouse'] },
  { id: 'cooking', legacyTabs: ['warehouse'] },
  { id: 'dishes', legacyTabs: ['warehouse'] },
  { id: 'groups', legacyTabs: ['warehouse'] },
  { id: 'sets', legacyTabs: ['warehouse'] },
  { id: 'finance', legacyTabs: ['finance'] },
  { id: 'contracts', legacyTabs: ['finance'] },
  { id: 'transactions', legacyTabs: ['finance'] },
  { id: 'orders', legacyTabs: ['orders'] },
  { id: 'routes', legacyTabs: ['orders', 'routes'] },
  { id: 'admins', legacyTabs: ['admins'] },
  { id: 'couriers', legacyTabs: ['admins'] },
  { id: 'clients', legacyTabs: ['clients'] },
  { id: 'calculator', legacyTabs: ['warehouse'] },
]

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

export function deriveVisibleResourcePages(allowedTabs: string[] | null | undefined): WorkspaceResourcePage[] {
  if (!Array.isArray(allowedTabs)) {
    return RESOURCE_PAGE_REGISTRY.map((page) => page.id)
  }
  const safeAllowedTabs = new Set(allowedTabs.filter((tab): tab is string => typeof tab === 'string'))
  return RESOURCE_PAGE_REGISTRY
    .filter((page) => page.legacyTabs.some((tab) => safeAllowedTabs.has(tab)))
    .map((page) => page.id)
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
