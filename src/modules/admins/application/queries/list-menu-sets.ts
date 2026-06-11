/**
 * List Menu Sets Query — Application layer.
 *
 * Encapsulates role-based scoping for menu sets so the HTTP route stays thin:
 * - SUPER_ADMIN: all sets, optionally filtered by an explicit adminId
 * - MIDDLE_ADMIN: own sets
 * - LOW_ADMIN: owner (parent middle admin) sets
 */

import { Prisma } from '@prisma/client'
import { BadRequestError } from '@/modules/shared/errors'
import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import { listMenuSets } from '../../infrastructure'
import type { MenuSetDTO } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export interface ListMenuSetsQuery {
  user: AuthUser
  /** Optional explicit admin scope (only honoured for SUPER_ADMIN). */
  requestedAdminId?: string | null
}

export async function executeListMenuSets(
  query: ListMenuSetsQuery,
): Promise<MenuSetDTO[]> {
  const { user, requestedAdminId = null } = query

  let ownerAdminId: string | null = null
  if (user.role === 'MIDDLE_ADMIN') {
    ownerAdminId = user.id
  } else if (user.role === 'LOW_ADMIN') {
    ownerAdminId = await getOwnerAdminId(user)
  } else if (user.role === 'SUPER_ADMIN') {
    ownerAdminId = requestedAdminId
  }

  const where: Prisma.MenuSetWhereInput = {}
  if (user.role !== 'SUPER_ADMIN') {
    if (!ownerAdminId) {
      throw new BadRequestError('Forbidden')
    }
    where.adminId = ownerAdminId
  } else if (ownerAdminId) {
    where.adminId = ownerAdminId
  }

  return listMenuSets(where)
}
