/**
 * Create Transaction Command — Application layer.
 *
 * Handles transaction creation with:
 * - Role-based scoping for effective admin ID
 * - Customer scope validation
 * - Balance updates (customer or company)
 */

import { getOwnerAdminId, getGroupAdminIds } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import type { CreateTransactionData, TransactionDetail } from '../../contracts'
import {
  createTransaction,
  verifyCustomerInScope,
  type CreateTransactionInput,
} from '../../infrastructure/finance.repository'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'

export interface CreateTransactionCommand {
  user: AuthUser
  data: CreateTransactionData
}

/**
 * Execute the Create Transaction command.
 */
export async function executeCreateTransaction(
  command: CreateTransactionCommand,
): Promise<TransactionDetail> {
  const { user, data } = command

  // Resolve effective admin ID
  const effectiveAdminId =
    user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(user)) ?? user.id
      : user.id

  // If customerId provided, verify it's in scope
  if (data.customerId) {
    const groupAdminIds = await getGroupAdminIds(user)
    const inScope = await verifyCustomerInScope(data.customerId, groupAdminIds)
    if (!inScope) {
      throw new NotFoundError('Customer', data.customerId)
    }
  }

  const input: CreateTransactionInput = {
    customerId: data.customerId,
    amount: data.amount,
    type: data.type,
    description: data.description,
    category: data.category,
    effectiveAdminId,
    actingUserId: user.id,
  }

  return createTransaction(input)
}
