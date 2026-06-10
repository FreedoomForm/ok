/**
 * Create Transaction Command — Application layer.
 *
 * Handles transaction creation with:
 * - Role-based scoping for effective admin ID
 * - Customer scope validation
 * - Balance updates (customer or company)
 * - Domain event outbox write
 */

import { getOwnerAdminId, getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { CreateTransactionData, TransactionDetail } from '../../contracts'
import {
  createTransaction,
  verifyCustomerInScope,
  type CreateTransactionInput,
} from '../../infrastructure/finance.repository'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { TransactionEntity } from '../../domain/transaction.entity'
import { createTransactionCreatedEvent } from '../../domain/finance.events'
import { writeToOutbox } from '@/modules/shared/events'
import { db } from '@/modules/shared/db'
import { invalidateCache } from '@/modules/shared/cache'

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

  // ── Domain validation ──
  const amountValidation = TransactionEntity.validateAmount(data.amount)
  if (!amountValidation.valid) {
    throw new BadRequestError(amountValidation.reason ?? 'Invalid transaction amount')
  }

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

  const result = await createTransaction(input)

  // ── Domain event: Transaction created → outbox ──
  try {
    await writeToOutbox(db, [
      createTransactionCreatedEvent({
        transactionId: result.id,
        amount: result.amount,
        type: result.type,
        category: result.category,
        adminId: result.adminId,
        customerId: result.customerId,
        salaryRecipientAdminId: result.salaryRecipientAdminId,
      }),
    ])
  } catch (error) {
    console.error('Error writing transaction.created event to outbox:', error)
  }

  // Invalidate cache
  invalidateCache('finance:')
  invalidateCache('dashboard:')

  return result
}
