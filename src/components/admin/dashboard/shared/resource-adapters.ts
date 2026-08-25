import type { ResourceCalendarKind } from './ResourceCalendarPanel'
import {
  UNIVERSAL_COMMANDS,
  WORKSPACE_RESOURCE_PAGES,
  type UniversalCommand,
  type WorkspaceResourcePage,
} from './workspace-state'

export type ResourceLegacyTab = 'orders' | 'clients' | 'admins' | 'bin' | 'statistics' | 'history' | 'warehouse' | 'finance'
export type WarehouseSubTab = 'cooking' | 'sets' | 'inventory' | 'calculator'
export type ResourceScope = 'admin' | 'middle-admin' | 'low-admin' | 'courier' | 'client'
export type ResourceMutation = 'create' | 'edit' | 'trash' | 'restore'

export type ResourceRequestDescriptor = {
  path: string | ((id: string) => string)
  method: 'POST' | 'PATCH' | 'DELETE'
  body?: (ids: readonly string[]) => Record<string, unknown>
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
const idPatch = (path: string, body: (ids: readonly string[]) => Record<string, unknown>): ResourceRequestDescriptor => ({
  path,
  method: 'PATCH',
  body,
})
const idDelete = (path: string): ResourceRequestDescriptor => ({
  path: (id) => `${path}/${encodeURIComponent(id)}`,
  method: 'DELETE',
})

export const RESOURCE_ADAPTERS: Readonly<Record<WorkspaceResourcePage, ResourceAdapter>> = {
  chat: { page: 'chat', legacyTab: null, calendarKind: 'CHAT_CONTACT', scopes: adminScopes, commands: allCommands, listPath: '/api/chat/contacts', searchParam: 'q', selectionField: 'id', mutations: { ...availabilityOnly, edit: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0] })), trash: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0], state: 'DELETED' })), restore: idPatch('/api/chat/contacts', (ids) => ({ id: ids[0], state: 'ENABLED' })) }, actionLog: true },
  settings: { page: 'settings', legacyTab: null, calendarKind: null, scopes: adminScopes, commands: allCommands, listPath: null, searchParam: null, selectionField: 'id', mutations: {}, actionLog: true },
  ingredients: { page: 'ingredients', legacyTab: 'warehouse', warehouseSubTab: 'inventory', calendarKind: 'INGREDIENT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/ingredients', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  cooking: { page: 'cooking', legacyTab: 'warehouse', warehouseSubTab: 'cooking', calendarKind: 'DISH', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/cooking-plan', searchParam: 'date', selectionField: 'id', mutations: {}, actionLog: true },
  dishes: { page: 'dishes', legacyTab: 'warehouse', warehouseSubTab: 'cooking', calendarKind: 'DISH', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/warehouse/dishes', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  groups: { page: 'groups', legacyTab: 'warehouse', warehouseSubTab: 'sets', calendarKind: 'GROUP', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/sets', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  sets: { page: 'sets', legacyTab: 'warehouse', warehouseSubTab: 'sets', calendarKind: 'SET', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/sets', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  finance: { page: 'finance', legacyTab: 'finance', calendarKind: 'VIRTUAL_CARD', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/finance/cards', searchParam: 'q', selectionField: 'id', mutations: { trash: { path: (id) => `/api/admin/finance/cards?id=${encodeURIComponent(id)}`, method: 'DELETE' }, restore: idPatch('/api/admin/finance/cards', (ids) => ({ id: ids[0], deletedAt: false })) }, actionLog: true },
  contracts: { page: 'contracts', legacyTab: 'finance', calendarKind: 'CONTRACT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/contracts', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  transactions: { page: 'transactions', legacyTab: 'finance', calendarKind: 'TRANSACTION', scopes: adminScopes, commands: allCommands, listPath: null, searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  orders: { page: 'orders', legacyTab: 'orders', calendarKind: 'ORDER', scopes: adminScopes, commands: allCommands, listPath: '/api/orders', searchParam: 'search', selectionField: 'id', mutations: { trash: bulk('/api/admin/orders/delete', 'DELETE', 'orderIds'), restore: bulk('/api/admin/orders/restore', 'POST', 'orderIds') }, actionLog: true },
  routes: { page: 'routes', legacyTab: 'orders', calendarKind: 'ROUTE', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/routes', searchParam: 'search', selectionField: 'id', mutations: { trash: idDelete('/api/admin/routes') }, actionLog: true },
  admins: { page: 'admins', legacyTab: 'admins', calendarKind: 'ADMIN', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/users-list', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  couriers: { page: 'couriers', legacyTab: 'admins', calendarKind: 'COURIER', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/couriers', searchParam: 'search', selectionField: 'id', mutations: {}, actionLog: true },
  clients: { page: 'clients', legacyTab: 'clients', calendarKind: 'CLIENT', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/clients', searchParam: 'search', selectionField: 'id', mutations: { trash: bulk('/api/admin/clients/delete', 'DELETE', 'clientIds'), restore: bulk('/api/admin/clients/restore', 'POST', 'clientIds') }, actionLog: true },
  calculator: { page: 'calculator', legacyTab: 'warehouse', warehouseSubTab: 'calculator', calendarKind: 'PURCHASE', scopes: adminScopes, commands: allCommands, listPath: '/api/admin/finance/purchases', searchParam: 'search', selectionField: 'id', mutations: { trash: { path: (id) => `/api/admin/finance/purchases?id=${encodeURIComponent(id)}`, method: 'DELETE' }, restore: idPatch('/api/admin/finance/purchases', (ids) => ({ id: ids[0], deletedAt: false })), edit: idPatch('/api/admin/finance/purchases', (ids) => ({ id: ids[0] })) }, actionLog: true },
}

export function getResourceAdapter(page: WorkspaceResourcePage): ResourceAdapter {
  return RESOURCE_ADAPTERS[page]
}

export function getResourcePageForLegacyTab(tab: string, warehouseSubTab: WarehouseSubTab = 'cooking'): WorkspaceResourcePage {
  if (tab === 'warehouse') {
    if (warehouseSubTab === 'calculator') return 'calculator'
    if (warehouseSubTab === 'sets') return 'sets'
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

export function buildResourceMutationRequest(
  page: WorkspaceResourcePage,
  mutation: ResourceMutation,
  ids: readonly string[],
): { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> } | null {
  if (ids.length === 0) return null
  const descriptor = getResourceMutation(page, mutation)
  if (!descriptor) return null
  const id = ids[0]
  const path = typeof descriptor.path === 'function' ? descriptor.path(id) : descriptor.path
  return { path, method: descriptor.method, ...(descriptor.body ? { body: descriptor.body(ids) } : {}) }
}
