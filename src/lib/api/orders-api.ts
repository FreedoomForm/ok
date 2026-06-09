import { fetchApi } from '@/lib/api-client'

export type DeleteOrdersResult = { deletedCount: number }
export type RestoreOrdersResult = { updatedCount: number; message?: string }
export type BulkUpdateOrdersResult = { updatedCount: number }
export type CreateAutoOrdersResult = { ordersCreated: number; message?: string }

export type BulkOrderFields = {
  orderStatus?: string
  paymentStatus?: string
  courierId?: string
  deliveryDate?: string
}

function compactOrderUpdates(updates: BulkOrderFields): Record<string, string> {
  const compact: Record<string, string> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (value) compact[key] = value
  }
  return compact
}

export async function deleteOrders(orderIds: string[]) {
  return fetchApi<DeleteOrdersResult>('/api/admin/orders/delete', {
    method: 'DELETE',
    body: { orderIds },
  })
}

export async function permanentDeleteOrders(orderIds: string[]) {
  return fetchApi<DeleteOrdersResult>('/api/admin/orders/permanent-delete', {
    method: 'DELETE',
    body: { orderIds },
  })
}

export async function restoreOrders(orderIds: string[]) {
  return fetchApi<RestoreOrdersResult>('/api/admin/orders/restore', {
    method: 'POST',
    body: { orderIds },
  })
}

export async function bulkUpdateOrders(orderIds: string[], updates: BulkOrderFields) {
  return fetchApi<BulkUpdateOrdersResult>('/api/admin/orders/bulk-update', {
    method: 'PATCH',
    body: { orderIds, updates: compactOrderUpdates(updates) },
  })
}

export async function createOrAutoOrders(targetDate?: Date) {
  return fetchApi<CreateAutoOrdersResult>('/api/admin/auto-orders/create', {
    method: 'POST',
    body: {
      targetDateISO: (targetDate ?? new Date()).toISOString(),
    },
  })
}
