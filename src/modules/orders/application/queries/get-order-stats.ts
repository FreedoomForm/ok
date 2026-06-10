/**
 * Get Order Stats Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import { getGroupAdminIds } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import {
  getOrderStats,
  type GetOrderStatsInput,
} from '../../infrastructure/order.repository'
import type { OrderStats } from '../../contracts'

export interface GetOrderStatsQuery {
  user: AuthUser
}

/**
 * Execute the Get Order Stats query.
 *
 * Resolves scoped admin IDs based on role, then delegates
 * to the repository for aggregation.
 */
export async function executeGetOrderStats(
  query: GetOrderStatsQuery,
): Promise<OrderStats> {
  const { user } = query

  let scopedAdminIds: string[] | null = null
  if (user.role !== 'SUPER_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    if (groupAdminIds && groupAdminIds.length > 0) {
      scopedAdminIds = groupAdminIds
    } else {
      scopedAdminIds = [user.id]
    }
  }

  const input: GetOrderStatsInput = { scopedAdminIds }
  return getOrderStats(input)
}
