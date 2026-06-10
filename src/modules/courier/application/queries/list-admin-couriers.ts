/**
 * List Couriers for Admin Query — Application layer.
 *
 * Lists all couriers scoped to the admin's group.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { ForbiddenError } from '@/modules/shared/errors'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { listCouriersForAdmin } from '../../infrastructure/courier.repository'
import type { AdminCourierDTO } from '../../contracts'

export interface ListAdminCouriersQuery {
  user: AuthUser
}

/**
 * Execute the List Admin Couriers query.
 */
export async function executeListAdminCouriers(
  query: ListAdminCouriersQuery,
): Promise<AdminCourierDTO[]> {
  const { user } = query

  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  return listCouriersForAdmin(groupAdminIds)
}
