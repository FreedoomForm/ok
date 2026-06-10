/**
 * List admins by role (low-admins or middle-admins).
 */
import { ForbiddenError } from '@/modules/shared/errors'
import { listLowAdmins, listMiddleAdmins } from '../../infrastructure'
import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import type { AdminListItem, AdminRoleString } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type ListAdminsQuery = {
  user: AuthUser
  role?: 'low' | 'middle'
}

export async function executeListAdmins({ user, role = 'low' }: ListAdminsQuery): Promise<AdminListItem[]> {
  if (role === 'middle') {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only SUPER_ADMIN can list middle admins')
    }
    return listMiddleAdmins()
  }

  // Low admins
  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions to list admins')
  }

  const ownerAdminId = user.role === 'LOW_ADMIN' ? await getOwnerAdminId(user) : null
  return listLowAdmins(user, ownerAdminId)
}
