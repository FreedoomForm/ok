/**
 * List Couriers for Admin Query — Application layer.
 *
 * Lists all couriers scoped to the admin's group.
 * Cached with B1 TTL (30s), invalidated on courier mutations.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { ForbiddenError } from '@/modules/shared/errors'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { listCouriersForAdmin } from '../../infrastructure/courier.repository'
import type { AdminCourierDTO } from '../../contracts'
import { cacheable, CacheKeys, CacheTTL } from '@/modules/shared/cache'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListAdminCouriersQuery {
  user: AuthUser
  cursor?: string
  limit?: number
}

/**
 * Execute the List Admin Couriers query.
 * Cached with B1 TTL (30s).
 */
export async function executeListAdminCouriers(
  query: ListAdminCouriersQuery,
): Promise<PaginatedResult<AdminCourierDTO>> {
  const { user, cursor, limit } = query

  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  // Build cache key
  const cacheKey = CacheKeys.courierList(user.id)

  return cacheable(async () => {
    return listCouriersForAdmin(groupAdminIds, cursor, limit)
  }, cacheKey, CacheTTL.B1)
}
