import { fetchApi } from '@/lib/api-client'

export type DeleteClientsResult = {
  deletedClients: number
  deletedOrders: number
}

export type ToggleClientsResult = {
  updatedCount: number
}

export type BulkUpdateClientsResult = {
  updatedCount: number
}

export type RestoreClientsResult = {
  restoredClients: number
  message?: string
}

export type PermanentDeleteClientsResult = {
  deletedClients: number
  message?: string
}

export type CreateClientResult = {
  client?: { name: string }
  autoOrdersCreated?: number
}

export type BulkClientFields = {
  isActive?: boolean
  calories?: string | number
}

type DeleteClientsOptions = {
  deleteOrders?: boolean
  daysBack?: number
}

function compactClientUpdates(updates: BulkClientFields): Record<string, unknown> {
  const compact: Record<string, unknown> = {}
  if (updates.isActive !== undefined) compact.isActive = updates.isActive
  if (updates.calories !== undefined && String(updates.calories).trim().length > 0) {
    compact.calories = updates.calories
  }
  return compact
}

export async function deleteClients(clientIds: string[], options?: DeleteClientsOptions) {
  return fetchApi<DeleteClientsResult>('/api/admin/clients/delete', {
    method: 'DELETE',
    body: {
      clientIds,
      deleteOrders: options?.deleteOrders ?? true,
      daysBack: options?.daysBack ?? 30,
    },
  })
}

export async function toggleClientsStatus(clientIds: string[], isActive: boolean) {
  return fetchApi<ToggleClientsResult>('/api/admin/clients/toggle-status', {
    method: 'PATCH',
    body: { clientIds, isActive },
  })
}

export async function bulkUpdateClients(clientIds: string[], updates: BulkClientFields) {
  return fetchApi<BulkUpdateClientsResult>('/api/admin/clients/bulk-update', {
    method: 'PATCH',
    body: { clientIds, updates: compactClientUpdates(updates) },
  })
}

export async function restoreClients(clientIds: string[]) {
  return fetchApi<RestoreClientsResult>('/api/admin/clients/restore', {
    method: 'POST',
    body: { clientIds },
  })
}

export async function permanentDeleteClients(clientIds: string[]) {
  return fetchApi<PermanentDeleteClientsResult>('/api/admin/clients/permanent-delete', {
    method: 'DELETE',
    body: { clientIds },
  })
}

export async function createClient(data: Record<string, unknown>, clientId?: string | null) {
  const url = clientId ? `/api/admin/clients/${clientId}` : '/api/admin/clients'
  const method = clientId ? 'PATCH' : 'POST'
  return fetchApi<CreateClientResult>(url, { method, body: data })
}

export async function createCourier(data: Record<string, unknown>) {
  return fetchApi<{ id: string }>('/api/admin/couriers', {
    method: 'POST',
    body: { ...data, role: 'COURIER' },
  })
}
