/**
 * Request Withdraw Command — Application layer.
 *
 * Handles courier withdrawal requests including balance validation
 * and company balance deduction.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { findCourierForWithdraw, calculateAvailableBalance, findPayerAdmin, processWithdraw, logAction } from '../../infrastructure/courier.repository'
import type { WithdrawData, WithdrawResult } from '../../contracts'

export interface RequestWithdrawCommand {
  user: AuthUser
  data: WithdrawData
}

/**
 * Execute the Request Withdraw command.
 */
export async function executeRequestWithdraw(
  command: RequestWithdrawCommand,
): Promise<WithdrawResult> {
  const { user, data } = command

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Forbidden')
  }

  const amount = Number(data.amount ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError('Invalid amount')
  }

  const courier = await findCourierForWithdraw(user.id)
  if (!courier || courier.salary <= 0) {
    throw new NotFoundError('Courier')
  }

  const payerAdminId = courier.createdBy || user.id
  const payer = await findPayerAdmin(payerAdminId)
  if (!payer) {
    throw new NotFoundError('Payer')
  }

  const available = await calculateAvailableBalance(courier.id, courier.salary, courier.createdAt)

  if (amount > available) {
    throw new BadRequestError('Amount exceeds available balance', { available })
  }

  if (payer.companyBalance < amount) {
    throw new BadRequestError('Insufficient company balance')
  }

  const result = await processWithdraw(courier.id, courier.name, payer.id, amount)

  await logAction(user.id, 'COURIER_WITHDRAW', 'TRANSACTION', result.transactionId, `Courier withdrew ${amount}`)

  return {
    success: true,
    transactionId: result.transactionId,
    withdrawn: amount,
    balance: available - amount,
  }
}
