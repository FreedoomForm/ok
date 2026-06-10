/**
 * List Transactions Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 * This is the function that API routes should call.
 */

import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  listTransactions,
  type ListTransactionsInput,
} from '../../infrastructure/finance.repository'
import type { CompanyBalance, TransactionFilters } from '../../contracts'

export interface ListTransactionsQuery {
  user: AuthUser
  filters?: TransactionFilters
}

/**
 * Resolve the effective admin ID for finance operations.
 *
 * - LOW_ADMIN: uses owner admin ID (parent middle admin)
 * - MIDDLE_ADMIN / SUPER_ADMIN: uses own ID
 */
async function resolveEffectiveAdminId(user: AuthUser): Promise<string> {
  if (user.role === 'LOW_ADMIN') {
    const ownerAdminId = await getOwnerAdminId(user)
    return ownerAdminId ?? user.id
  }
  return user.id
}

/**
 * Execute the List Transactions query.
 *
 * Handles role-based data isolation and delegates to the repository
 * for data access and transformation.
 */
export async function executeListTransactions(
  query: ListTransactionsQuery,
): Promise<CompanyBalance> {
  const effectiveAdminId = await resolveEffectiveAdminId(query.user)

  const input: ListTransactionsInput = {
    effectiveAdminId,
    filters: query.filters,
  }

  return listTransactions(input)
}
