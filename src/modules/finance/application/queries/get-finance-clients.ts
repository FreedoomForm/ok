/**
 * Get Finance Clients Query — Application layer.
 *
 * Returns client balance summaries for the finance dashboard.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  getFinanceClients,
  type GetFinanceClientsInput,
} from '../../infrastructure/finance.repository'
import type { FinanceClientSummary } from '../../contracts'

export interface GetFinanceClientsQuery {
  user: AuthUser
  filter?: string
  search?: string
  asOf?: Date | null
}

/**
 * Resolve scoped createdBy IDs based on the user's role.
 *
 * - SUPER_ADMIN: null (no restriction)
 * - MIDDLE_ADMIN: self + all LOW_ADMINs they created
 * - LOW_ADMIN: owner group (parent middle admin + siblings)
 */
async function resolveScopedCreatedBy(
  user: AuthUser,
): Promise<string[] | null> {
  if (user.role === 'SUPER_ADMIN') return null

  const groupAdminIds = await getGroupAdminIds(user)
  return groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
}

/**
 * Execute the Get Finance Clients query.
 */
export async function executeGetFinanceClients(
  query: GetFinanceClientsQuery,
): Promise<FinanceClientSummary[]> {
  const scopedCreatedBy = await resolveScopedCreatedBy(query.user)

  const input: GetFinanceClientsInput = {
    groupAdminIds: scopedCreatedBy,
    filter: query.filter,
    search: query.search,
    asOf: query.asOf,
  }

  return getFinanceClients(input)
}
