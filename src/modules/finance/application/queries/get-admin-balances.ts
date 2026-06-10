/**
 * Get Admin Balances Query — Application layer.
 *
 * Returns salary balance data for staff within the user's scope.
 */

import { getOwnerAdminId, getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  getAdminBalances,
  type GetAdminBalancesInput,
} from '../../infrastructure/finance.repository'
import type { AdminBalanceResult } from '../../contracts'

export interface GetAdminBalancesQuery {
  user: AuthUser
  asOf?: Date
  from?: Date | null
  to?: Date | null
}

/**
 * Execute the Get Admin Balances query.
 */
export async function executeGetAdminBalances(
  query: GetAdminBalancesQuery,
): Promise<AdminBalanceResult> {
  const { user } = query

  const effectiveAdminId =
    user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(user)) ?? user.id
      : user.id

  const groupAdminIds = await getGroupAdminIds(user)
  const asOf = query.asOf ?? new Date()

  const input: GetAdminBalancesInput = {
    effectiveAdminId,
    groupAdminIds,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
    asOf,
    from: query.from ?? null,
    to: query.to ?? null,
  }

  return getAdminBalances(input)
}
