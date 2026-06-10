/**
 * Courier Domain Errors — Domain layer.
 */

import { BadRequestError, ForbiddenError } from '@/modules/shared/errors'

/** Thrown when a courier cannot accept an order. */
export class CourierCannotAcceptOrderError extends ForbiddenError {
  constructor(courierId: string, reason: string) {
    super(`Courier ${courierId} cannot accept order: ${reason}`, { courierId, reason })
    this.name = 'CourierCannotAcceptOrderError'
  }
}

/** Thrown when a withdrawal amount exceeds the available balance. */
export class WithdrawalExceedsBalanceError extends BadRequestError {
  constructor(amount: number, available: number) {
    super(`Withdrawal ${amount} exceeds available balance ${available}`, { amount, available })
    this.name = 'WithdrawalExceedsBalanceError'
  }
}
