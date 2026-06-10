/**
 * Pay Salary Command — Application layer.
 *
 * Handles salary payment with:
 * - Role-based scoping for staff access
 * - Staff scope validation
 * - Company balance deduction
 * - Domain event outbox write
 */

import { getOwnerAdminId, getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { PaySalaryData } from '../../contracts'
import {
  paySalary,
  verifyStaffInScope,
  type PaySalaryInput,
} from '../../infrastructure/finance.repository'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { TransactionEntity } from '../../domain/transaction.entity'
import { createSalaryPaidEvent } from '../../domain/finance.events'
import { writeToOutbox } from '@/modules/shared/events'
import { db } from '@/modules/shared/db'

export interface PaySalaryCommand {
  user: AuthUser
  data: PaySalaryData
}

/**
 * Execute the Pay Salary command.
 */
export async function executePaySalary(
  command: PaySalaryCommand,
): Promise<{ success: boolean }> {
  const { user, data } = command

  const targetAdminId = data.recipientAdminId ?? data.adminId

  if (!targetAdminId || !data.amount || data.amount <= 0) {
    throw new BadRequestError('Invalid data')
  }

  // ── Domain validation ──
  const amountValidation = TransactionEntity.validateAmount(data.amount)
  if (!amountValidation.valid) {
    throw new BadRequestError(amountValidation.reason ?? 'Invalid salary amount')
  }

  // Resolve effective admin ID
  const effectiveAdminId =
    user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(user)) ?? user.id
      : user.id

  const groupAdminIds = await getGroupAdminIds(user)
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  // Verify staff is in scope
  const staff = await verifyStaffInScope(targetAdminId, groupAdminIds, isSuperAdmin)
  if (!staff) {
    throw new NotFoundError('Staff member', targetAdminId)
  }

  const input: PaySalaryInput = {
    targetAdminId,
    amount: data.amount,
    effectiveAdminId,
    actingUserId: user.id,
  }

  const result = await paySalary(input)

  // ── Domain event: Salary paid → outbox ──
  try {
    await writeToOutbox(db, [
      createSalaryPaidEvent({
        transactionId: '', // not returned from paySalary
        recipientAdminId: targetAdminId,
        amount: data.amount,
        paidBy: user.id,
      }),
    ])
  } catch (error) {
    console.error('Error writing transaction.salary-paid event to outbox:', error)
  }

  return result
}
