/**
 * Get Company Balance Query — Application layer.
 *
 * Returns company balance and transaction history.
 * This is a convenience wrapper around listTransactions that
 * returns the company balance with transaction history.
 */

import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  listTransactions,
  type ListTransactionsInput,
} from '../../infrastructure/finance.repository'
import type { CompanyBalance, TransactionFilters } from '../../contracts'

export interface GetCompanyBalanceQuery {
  user: AuthUser
  filters?: TransactionFilters
}

/**
 * Execute the Get Company Balance query.
 */
export async function executeGetCompanyBalance(
  query: GetCompanyBalanceQuery,
): Promise<CompanyBalance> {
  const effectiveAdminId =
    query.user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(query.user)) ?? query.user.id
      : query.user.id

  const input: ListTransactionsInput = {
    effectiveAdminId,
    filters: query.filters,
  }

  return listTransactions(input)
}
