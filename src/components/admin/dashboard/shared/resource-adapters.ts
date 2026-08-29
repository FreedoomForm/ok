import type { ResourceCalendarKind } from './ResourceCalendarPanel'
import {
  UNIVERSAL_COMMANDS,
  WORKSPACE_RESOURCE_PAGES,
  type UniversalCommand,
  type WorkspaceResourcePage,
} from './workspace-state'

export type ResourceLegacyTab = 'orders' | 'clients' | 'admins' | 'bin' | 'statistics' | 'history' | 'warehouse' | 'finance'
export type WarehouseSubTab = 'cooking' | 'dishes' | 'sets' | 'inventory' | 'calculator'
export type ResourceScope = 'admin' | 'middle-admin' | 'low-admin' | 'courier' | 'client'
export type ResourceMutation = 'create' | 'edit' | 'trash' | 'restore' | 'enable' | 'disable'

export type ResourceRequestDescriptor = {
  path: string | ((id: string) => string)
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: (ids: readonly string[]) => Record<string, unknown>
  /** When true the mutation targets one row per request even though the path is a fixed endpoint. */
  perId?: boolean
}

export type ResourceAdapter = {
  page: WorkspaceResourcePage
  legacyTab: ResourceLegacyTab | null
  warehouseSubTab?: WarehouseSubTab
  calendarKind: ResourceCalendarKind | null
  scopes: readonly ResourceScope[]
  commands: readonly UniversalCommand[]
  listPath: string | null
  searchParam: string | null
  selectionField: string
  mutations: Readonly<Partial<Record<ResourceMutation, ResourceRequestDescriptor>>>
  actionLog: boolean
}

const allCommands = [...UNIVERSAL_COMMANDS] as const
const adminScopes = ['admin', 'middle-admin', 'low-admin'] as const
const availabilityOnly: Readonly<Partial<Record<ResourceMutation, ResourceRequestDescriptor>>> = {}
const bulk = (path: string, method: 'POST' | 'DELETE', field: string): ResourceRequestDescriptor => ({
  path,
  method,
  body: (ids) => ({ [field]: ids }),
})
const bulkPatch = (path: string, field: string, value: unknown): ResourceRequestDescriptor => ({
  path,
  method: 'PATCH',
  body: (ids) => ({ [field]: ids, isActive: value }),
})
const idPatch = (path: string, body: (ids: readonly string[]) => Record<string, unknown>): ResourceRequestDescriptor => ({
  path,
  method: 'PATCH',
  body,
  perId: true,
})
const idPut = (path: string, body: (ids: readonly string[]) => Record<string, unknown>): ResourceRequestDescriptor => ({
  path,
  method: 'PUT',
  body,
  perId: true,
})
const idPatchPath = (path: string, body: (ids: readonly string[]) => Record<string, unknown>): ResourceRequestDescriptor => ({
  path: (id) => `${path}/${encodeURIComponent(id)}`,
  method: 'PATCH',
  body,
})
const idDelete = (path: string): ResourceRequestDescriptor => ({
  path: (id) => `${path}/${encodeURIComponent(id)}`,
  method: 'DELETE',
})
const queryDelete = (path: string, field: string): ResourceRequestDescriptor => ({
  path: (id) => `${path}?${field}=${encodeURIComponent(id)}`,
  method: 'DELETE',
})
const groupPath = (id: string) => {
  const separator = id.indexOf(':')
  if (separator <= 0 || separator === id.length - 1) return `/api/admin/sets/${encodeURIComponent(id)}/groups/invalid`
  return `/api/admin/sets/${encodeURIComponent(id.slice(0, separator))}/groups/${encodeURIComponent(id.slice(separator + 1))}`
}
const groupMutation = (value: Record<string, unknown>): ResourceRequestDescriptor => ({
  path: groupPath,
  method: 'PATCH',
  body: () => value,
})

export const RESOURCE_ADAPTERS: Readonly<Record<WorkspaceResourcePage, ResourceAdapter>> = {
  chat: { page: 'chat', legacyTab: null, calendarKind: 'CHAT_CONTACT', scopes: adminScopes, commands: allCommands, listPath: '/api/chat/contacts', searchParam: 'q', selectionField: 'id', mutations: { ...availabilityOnly, edit: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0] })), trash: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0], state: 'DELETED' })), restore: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0], state: 'ENABLED' })) }, actionLog: true },
  settings: { page: 'settings', legacyTab: null, calendarKind: null, scopes: adminScopes, commands: allCommands, listPath: '/api/admin/settings', searchParam: null, selectionField: 'id', mutations: { edit: { path: '/api/admin/settings', method: 'PUT' } }, actionLog: true },
  ingredients: { page: 'ingredients', legacyTab: 'warehouse', warehouseSubTab: 'inventory', calendarKind: 'INGREDIENT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/ingredients', searchParam: 'search', selectionField: 'id', mutations: { edit: idPut('/api/admin/warehouse/ingredients', (ids) => ({ id: ids[0] })), trash: { path: (id) => `/api/admin/warehouse/ingredients?id=${encodeURIComponent(id)}`, method: 'DELETE' }, restore: idPatch('/api/admin/warehouse/ingredients', (ids) => ({ id: ids[0], deletedAt: false })), enable: idPatch('/api/admin/warehouse/ingredients', (ids) => ({ id: ids[0], isActive: true })), disable: idPatch('/api/admin/warehouse/ingredients', (ids) => ({ id: ids[0], isActive: false })) }, actionLog: true },
  cooking: { page: 'cooking', legacyTab: 'warehouse', warehouseSubTab: 'cooking', calendarKind: 'COOKING_RECORD', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/cooking-plan', searchParam: 'date', selectionField: 'id', mutations: { trash: queryDelete('/api/admin/warehouse/cooking-plan', 'id'), restore: { path: '/api/admin/warehouse/cooking-plan', method: 'PATCH', body: (ids) => ({ id: ids[0], deletedAt: false, isActive: true }), perId: true }, enable: { path: '/api/admin/warehouse/cooking-plan', method: 'PATCH', body: (ids) => ({ id: ids[0], isActive: true }), perId: true }, disable: { path: '/api/admin/warehouse/cooking-plan', method: 'PATCH', body: (ids) => ({ id: ids[0], isActive: false }), perId: true } }, actionLog: true },
  dishes: { page: 'dishes', legacyTab: 'warehouse', warehouseSubTab: 'dishes', calendarKind: 'DISH', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/dishes', searchParam: 'search', selectionField: 'id', mutations: { edit: idPut('/api/admin/warehouse/dishes', (ids) => ({ id: ids[0] })), trash: { path: (id) => `/api/admin/warehouse/dishes?id=${encodeURIComponent(id)}`, method: 'DELETE' }, restore: idPatch('/api/admin/warehouse/dishes', (ids) => ({ id: ids[0], deletedAt: false })), enable: idPatch('/api/admin/warehouse/dishes', (ids) => ({ id: ids[0], isActive: true })), disable: idPatch('/api/admin/warehouse/dishes', (ids) => ({ id: ids[0], isActive: false })) }, actionLog: true },
  groups: { page: 'groups', legacyTab: 'warehouse', warehouseSubTab: 'sets', calendarKind: 'GROUP', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/sets', searchParam: 'search', selectionField: 'id', mutations: { trash: groupMutation({ deletedAt: true }), restore: groupMutation({ deletedAt: false }), enable: groupMutation({ isActive: true }), disable: groupMutation({ isActive: false }) }, actionLog: true },
  sets: { page: 'sets', legacyTab: 'warehouse', warehouseSubTab: 'sets', calendarKind: 'SET', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/sets', searchParam: 'search', selectionField: 'id', mutations: { trash: { path: (id) => `/api/admin/sets/${encodeURIComponent(id)}`, method: 'DELETE' }, restore: { path: (id) => `/api/admin/sets/${encodeURIComponent(id)}`, method: 'PATCH', body: () => ({ deletedAt: false }) }, enable: { path: (id) => `/api/admin/sets/${encodeURIComponent(id)}`, method: 'PATCH', body: () => ({ isActive: true }) }, disable: { path: (id) => `/api/admin/sets/${encodeURIComponent(id)}`, method: 'PATCH', body: () => ({ isActive: false }) } }, actionLog: true },
  finance: { page: 'finance', legacyTab: 'finance', calendarKind: 'VIRTUAL_CARD', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/finance/cards', searchParam: 'q', selectionField: 'id', mutations: { trash: idPatch('/api/admin/finance/cards', (ids) => ({ id: ids[0], deletedAt: true })), restore: idPatch('/api/admin/finance/cards', (ids) => ({ id: ids[0], deletedAt: false })), enable: idPatch('/api/admin/finance/cards', (ids) => ({ id: ids[0], isActive: true })), disable: idPatch('/api/admin/finance/cards', (ids) => ({ id: ids[0], isActive: false })) }, actionLog: true },
  contracts: { page: 'contracts', legacyTab: 'finance', calendarKind: 'CONTRACT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/contracts', searchParam: 'search', selectionField: 'id', mutations: { trash: idPatchPath('/api/admin/contracts', () => ({ status: 'DELETED' })), restore: idPatchPath('/api/admin/contracts', () => ({ status: 'ENABLED' })), enable: idPatchPath('/api/admin/contracts', () => ({ status: 'ENABLED' })), disable: idPatchPath('/api/admin/contracts', () => ({ status: 'DISABLED' })) }, actionLog: true },
  transactions: { page: 'transactions', legacyTab: 'finance', calendarKind: 'TRANSACTION', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/finance/company', searchParam: 'search', selectionField: 'id', mutations: { trash: idPatch('/api/admin/finance/company', (ids) => ({ id: ids[0], deletedAt: true })), restore: idPatch('/api/admin/finance/company', (ids) => ({ id: ids[0], deletedAt: false })), enable: idPatch('/api/admin/finance/company', (ids) => ({ id: ids[0], isActive: true })), disable: idPatch('/api/admin/finance/company', (ids) => ({ id: ids[0], isActive: false })) }, actionLog: true },
  orders: { page: 'orders', legacyTab: 'orders', calendarKind: 'ORDER', scopes: adminScopes, commands: allCommands, listPath: '/api/orders', searchParam: 'search', selectionField: 'id', mutations: { trash: bulk('/api/admin/orders/delete', 'DELETE', 'orderIds'), restore: bulk('/api/admin/orders/restore', 'POST', 'orderIds') }, actionLog: true },
  routes: { page: 'routes', legacyTab: 'orders', calendarKind: 'ROUTE', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/routes', searchParam: 'search', selectionField: 'id', mutations: { trash: idDelete('/api/admin/routes'), restore: idPatchPath('/api/admin/routes', () => ({ deletedAt: null, isActive: true })), enable: idPatchPath('/api/admin/routes', () => ({ isActive: true })), disable: idPatchPath('/api/admin/routes', () => ({ isActive: false })) }, actionLog: true },
  admins: { page: 'admins', legacyTab: 'admins', calendarKind: 'ADMIN', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/users-list', searchParam: 'search', selectionField: 'id', mutations: { trash: idPatch('/api/admin/users-list', (ids) => ({ id: ids[0], deletedAt: true })), restore: idPatch('/api/admin/users-list', (ids) => ({ id: ids[0], deletedAt: false })), enable: idPatch('/api/admin/users-list', (ids) => ({ id: ids[0], isActive: true })), disable: idPatch('/api/admin/users-list', (ids) => ({ id: ids[0], isActive: false })) }, actionLog: true },
  couriers: { page: 'couriers', legacyTab: 'admins', calendarKind: 'COURIER', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/couriers', searchParam: 'search', selectionField: 'id', mutations: { trash: idPatch('/api/admin/couriers', (ids) => ({ courierId: ids[0], deletedAt: true })), restore: idPatch('/api/admin/couriers', (ids) => ({ courierId: ids[0], deletedAt: false })), enable: idPatch('/api/admin/couriers', (ids) => ({ courierId: ids[0], isActive: true })), disable: idPatch('/api/admin/couriers', (ids) => ({ courierId: ids[0], isActive: false })) }, actionLog: true },
  clients: { page: 'clients', legacyTab: 'clients', calendarKind: 'CLIENT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/clients', searchParam: 'search', selectionField: 'id', mutations: { trash: bulk('/api/admin/clients/delete', 'DELETE', 'clientIds'), restore: bulk('/api/admin/clients/restore', 'POST', 'clientIds'), enable: bulkPatch('/api/admin/clients/toggle-status', 'clientIds', true), disable: bulkPatch('/api/admin/clients/toggle-status', 'clientIds', false) }, actionLog: true },
  calculator: { page: 'calculator', legacyTab: 'warehouse', warehouseSubTab: 'calculator', calendarKind: 'PURCHASE', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/finance/purchases', searchParam: 'search', selectionField: 'id', mutations: { trash: { path: (id) => `/api/admin/finance/purchases?id=${encodeURIComponent(id)}`, method: 'DELETE' }, restore: idPatch('/api/admin/finance/purchases', (ids) => ({ id: ids[0], deletedAt: false })), edit: idPatch('/api/admin/finance/purchases', (ids) => ({ id: ids[0] })) }, actionLog: true },
}

export function getResourceAdapter(page: WorkspaceResourcePage): ResourceAdapter {
  return RESOURCE_ADAPTERS[page]
}

export function getResourcePageForLegacyTab(tab: string, warehouseSubTab: WarehouseSubTab = 'cooking'): WorkspaceResourcePage {
  if (tab === 'warehouse') {
    if (warehouseSubTab === 'calculator') return 'calculator'
    if (warehouseSubTab === 'sets') return 'sets'
    if (warehouseSubTab === 'dishes') return 'dishes'
    return warehouseSubTab === 'inventory' ? 'ingredients' : 'cooking'
  }
  const page = WORKSPACE_RESOURCE_PAGES.find((candidate) => getResourceAdapter(candidate).legacyTab === tab)
  return page ?? 'orders'
}

export function getCalendarKindForResource(page: WorkspaceResourcePage): ResourceCalendarKind | null {
  return getResourceAdapter(page).calendarKind
}

export function getLegacyTabForResource(page: WorkspaceResourcePage): ResourceLegacyTab | null {
  return getResourceAdapter(page).legacyTab
}

export function getWarehouseSubTabForResource(page: WorkspaceResourcePage): WarehouseSubTab | null {
  return getResourceAdapter(page).warehouseSubTab ?? null
}

export function supportsResourceCommand(page: WorkspaceResourcePage, command: UniversalCommand): boolean {
  return getResourceAdapter(page).commands.includes(command)
}

export function getResourceMutation(page: WorkspaceResourcePage, mutation: ResourceMutation): ResourceRequestDescriptor | null {
  return getResourceAdapter(page).mutations[mutation] ?? null
}

export type ResourceMutationRequest = { path: string; method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> }

/**
 * Builds every HTTP request a universal mutation must issue so that EVERY
 * selected row is affected: per-id adapters fan out one request per selected
 * id, while true bulk endpoints keep a single aggregated request carrying the
 * whole selection. Duplicate and empty ids are ignored.
 */
export function buildResourceMutationRequests(
  page: WorkspaceResourcePage,
  mutation: ResourceMutation,
  ids: readonly string[],
): ResourceMutationRequest[] {
  const descriptor = getResourceMutation(page, mutation)
  if (!descriptor) return []
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))]
  if (uniqueIds.length === 0) return []
  const descriptorPath = descriptor.path
  if (typeof descriptorPath === 'function' || descriptor.perId === true) {
    return uniqueIds.map((id) => ({
      path: typeof descriptorPath === 'function' ? descriptorPath(id) : descriptorPath,
      method: descriptor.method,
      ...(descriptor.body ? { body: descriptor.body([id]) } : {}),
    }))
  }
  return [{
    path: descriptorPath,
    method: descriptor.method,
    ...(descriptor.body ? { body: descriptor.body(uniqueIds) } : {}),
  }]
}

export function buildResourceMutationRequest(
  page: WorkspaceResourcePage,
  mutation: ResourceMutation,
  ids: readonly string[],
): ResourceMutationRequest | null {
  return buildResourceMutationRequests(page, mutation, ids)[0] ?? null
}
