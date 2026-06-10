/**
 * Finance Domain Errors — Domain layer.
 */

import { BadRequestError, ConflictError, ValidationFailedError } from '@/modules/shared/errors'

/** Thrown when a transaction amount is invalid. */
export class InvalidTransactionAmountError extends BadRequestError {
  constructor(amount: number, reason: string) {
    super(`Invalid transaction amount ${amount}: ${reason}`, { amount, reason })
    this.name = 'InvalidTransactionAmountError'
  }
}

/** Thrown when a transaction cannot be reversed. */
export class TransactionNotReversibleError extends ConflictError {
  constructor(transactionId: string, reason: string) {
    super(`Transaction ${transactionId} cannot be reversed: ${reason}`, { transactionId, reason })
    this.name = 'TransactionNotReversibleError'
  }
}

/** Thrown when company balance is insufficient. */
export class InsufficientBalanceError extends BadRequestError {
  constructor(required: number, available: number) {
    super(`Insufficient balance: need ${required}, have ${available}`, { required, available })
    this.name = 'InsufficientBalanceError'
  }
}

/** Thrown when finance data validation fails. */
export class FinanceValidationError extends ValidationFailedError {
  constructor(reason: string) {
    super(`Finance validation failed: ${reason}`)
    this.name = 'FinanceValidationError'
  }
}
