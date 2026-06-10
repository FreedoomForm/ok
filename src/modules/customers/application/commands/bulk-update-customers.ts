/**
 * Bulk Update Customers Command — Application layer.
 *
 * Handles bulk updates for multiple customers at once.
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds, filterCustomerIdsInGroup } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { BatchResult } from '../../contracts'
import { BadRequestError } from '@/modules/shared/errors'

export interface BulkUpdateCustomersCommand {
  user: AuthUser
  clientIds: string[]
  updates: {
    isActive?: boolean
    calories?: string | number
    [key: string]: unknown
  }
}

export async function executeBulkUpdateCustomers(
  command: BulkUpdateCustomersCommand,
): Promise<BatchResult> {
  const { user, clientIds, updates } = command

  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    throw new BadRequestError('Не указаны ID клиентов')
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new BadRequestError('Не указаны данные для обновления')
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {}

  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.calories !== undefined) {
    updateData.calories = parseInt(String(updates.calories)) || 2000
  }

  const scopedCreatedBy = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
  const allowedIds = scopedCreatedBy
    ? await filterCustomerIdsInGroup(clientIds, scopedCreatedBy)
    : clientIds

  const skippedCount = clientIds.length - allowedIds.length

  const result = await db.customer.updateMany({
    where: { id: { in: allowedIds } },
    data: updateData,
  })

  return {
    affectedCount: result.count,
    skippedCount,
  }
}
