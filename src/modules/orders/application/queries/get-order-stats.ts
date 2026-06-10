/**
 * Get Order Stats Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 * Uses read model when available, falls back to raw data computation.
 * Cached with B1 TTL (30s), invalidated on order mutations.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  getOrderStats,
  type GetOrderStatsInput,
} from '../../infrastructure/order.repository'
import {
  getOrderStatsFromReadModel,
  updateOrderStatsReadModel,
} from '../../infrastructure/order-stats-read-model'
import { cacheable, CacheKeys, CacheTTL } from '@/modules/shared/cache'
import type { OrderStats } from '../../contracts'

export interface GetOrderStatsQuery {
  user: AuthUser
}

/**
 * Resolve the admin ID used for read model lookup.
 * For SUPER_ADMIN: uses the admin's own ID.
 * For others: uses the first ID in the group (typically the MIDDLE_ADMIN).
 */
async function resolveReadModelAdminId(user: AuthUser): Promise<string> {
  if (user.role === 'SUPER_ADMIN') return user.id

  const groupAdminIds = await getGroupAdminIds(user)
  if (groupAdminIds && groupAdminIds.length > 0) {
    return groupAdminIds[0]
  }
  return user.id
}

/**
 * Execute the Get Order Stats query.
 *
 * Flow:
 * 1. Check cache (B1 TTL = 30s)
 * 2. Try read model (pre-computed stats)
 * 3. If read model data is fresh (updated within last 5 min), cache & return it
 * 4. If stale/missing, compute from raw data (existing logic)
 * 5. Update the read model for future requests
 * 6. Cache the result
 */
export async function executeGetOrderStats(
  query: GetOrderStatsQuery,
): Promise<OrderStats> {
  const { user } = query

  // Build cache key based on user scope
  const readModelAdminId = await resolveReadModelAdminId(user)
  const cacheKey = CacheKeys.orderStats(readModelAdminId, 'all')

  return cacheable(async () => {
    // Try read model first
    try {
      const readModelStats = await getOrderStatsFromReadModel(readModelAdminId)
      if (readModelStats) {
        return readModelStats
      }
    } catch (error) {
      // Read model lookup failed — fall through to raw computation
      console.warn('[get-order-stats] Read model lookup failed, computing from raw data:', error)
    }

    // Fallback: compute from raw data
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
    const stats = await getOrderStats(input)

    // Update read model for future requests (best-effort, don't block)
    updateOrderStatsReadModel(readModelAdminId, stats).catch((error) => {
      console.warn('[get-order-stats] Failed to update read model:', error)
    })

    return stats
  }, cacheKey, CacheTTL.B1)
}
