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

/**
 * Helper to unwrap the new `{ data: ... }` response format.
 * Uses `json?.data ?? json` for backward compatibility.
 */
function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}

export async function deleteClients(clientIds: string[], options?: DeleteClientsOptions) {
  const result = await fetchApi<DeleteClientsResult>('/api/admin/clients/delete', {
    method: 'DELETE',
    body: {
      clientIds,
      deleteOrders: options?.deleteOrders ?? true,
      daysBack: options?.daysBack ?? 30,
    },
  })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function toggleClientsStatus(clientIds: string[], isActive: boolean) {
  const result = await fetchApi<ToggleClientsResult>('/api/admin/clients/toggle-status', {
    method: 'PATCH',
    body: { clientIds, isActive },
  })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function bulkUpdateClients(clientIds: string[], updates: BulkClientFields) {
  const result = await fetchApi<BulkUpdateClientsResult>('/api/admin/clients/bulk-update', {
    method: 'PATCH',
    body: { clientIds, updates: compactClientUpdates(updates) },
  })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function restoreClients(clientIds: string[]) {
  const result = await fetchApi<RestoreClientsResult>('/api/admin/clients/restore', {
    method: 'POST',
    body: { clientIds },
  })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function permanentDeleteClients(clientIds: string[]) {
  const result = await fetchApi<PermanentDeleteClientsResult>('/api/admin/clients/permanent-delete', {
    method: 'DELETE',
    body: { clientIds },
  })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function createClient(data: Record<string, unknown>, clientId?: string | null) {
  const url = clientId ? `/api/admin/clients/${clientId}` : '/api/admin/clients'
  const method = clientId ? 'PATCH' : 'POST'
  const result = await fetchApi<CreateClientResult>(url, { method, body: data })
  return result.ok ? { ...result, data: unwrapData(result.data) } : result
}

export async function createCourier(data: Record<string, unknown>) {
  return fetchApi<{ id: string }>('/api/admin/couriers', {
    method: 'POST',
    body: { ...data, role: 'COURIER' },
  })
}
