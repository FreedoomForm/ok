/**
 * List Orders Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 * Cached with B1 TTL (30s), invalidated on order mutations.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  listOrders,
  type ListOrdersInput,
} from '../../infrastructure/order.repository'
import type { OrderListItem, OrderListFilters } from '../../contracts'
import { cacheable, CacheKeys, CacheTTL } from '@/modules/shared/cache'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListOrdersQuery {
  user: AuthUser
  date?: string | null
  from?: string | null
  to?: string | null
  filters?: OrderListFilters | null
  includeDeleted?: boolean
  deletedOnly?: boolean
  cursor?: string
  limit?: number
}

/**
 * Resolve scoped admin IDs based on the user's role.
 *
 * - SUPER_ADMIN / COURIER: null (no restriction)
 * - MIDDLE_ADMIN: self + all LOW_ADMINs they created
 * - LOW_ADMIN: owner group (parent middle admin + siblings)
 */
async function resolveScopedAdminIds(
  user: AuthUser,
): Promise<string[] | null> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'COURIER') return null

  if (user.role === 'MIDDLE_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    return groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
  }

  if (user.role === 'LOW_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    return groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
  }

  return [user.id]
}

/**
 * Build a stable hash from filters for cache key.
 * Uses JSON.stringify for simplicity (not cryptographic).
 */
function filtersHash(filters?: OrderListFilters | null): string {
  if (!filters) return 'none'
  const keys = Object.keys(filters).filter(
    (k) => filters[k as keyof OrderListFilters],
  )
  return keys.length > 0 ? keys.sort().join(',') : 'none'
}

/**
 * Execute the List Orders query.
 *
 * Handles role-based data isolation and courier-specific filtering,
 * then delegates to the repository for data access and transformation.
 * Results are cached with B1 TTL (30s).
 */
export async function executeListOrders(
  query: ListOrdersQuery,
): Promise<PaginatedResult<OrderListItem>> {
  const scopedAdminIds = await resolveScopedAdminIds(query.user)

  // Build cache key
  const adminId = scopedAdminIds ? scopedAdminIds[0] : query.user.id
  const cacheKey = CacheKeys.orderList(
    adminId,
    `${query.date || 'all'}:${query.from || ''}:${query.to || ''}:${filtersHash(query.filters)}:${query.includeDeleted ? '1' : '0'}:${query.deletedOnly ? '1' : '0'}:${query.cursor || ''}:${query.limit || ''}`,
  )

  return cacheable(async () => {
    const input: ListOrdersInput = {
      scopedAdminIds,
      date: query.date,
      from: query.from,
      to: query.to,
      filters: query.filters,
      includeDeleted: query.includeDeleted,
      deletedOnly: query.deletedOnly,
      cursor: query.cursor,
      limit: query.limit,
      // Couriers only see today's orders assigned to them
      courierFilter:
        query.user.role === 'COURIER'
          ? { courierId: query.user.id }
          : null,
    }

    return listOrders(input)
  }, cacheKey, CacheTTL.B1)
}
