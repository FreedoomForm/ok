/**
 * Transaction Entity — Domain layer.
 *
 * Encapsulates business rules for financial transactions:
 * - Amount validation
 * - Reversal rules
 * - Balance checks
 */

import type { TransactionType } from '../contracts'

export class TransactionEntity {
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly type: TransactionType,
    public readonly category: string | null,
    public readonly adminId: string | null,
    public readonly customerId: string | null,
    public readonly salaryRecipientAdminId: string | null,
  ) {}

  /**
   * Check if the transaction amount is valid.
   * Business rule: amount must be positive and finite.
   */
  isValidAmount(): boolean {
    return Number.isFinite(this.amount) && this.amount > 0
  }

  /**
   * Check if the transaction can be reversed.
   * Business rule: only recent transactions (< 24h) can be reversed.
   * SALARY transactions cannot be reversed.
   */
  canBeReversed(): { allowed: boolean; reason?: string } {
    if (this.category === 'SALARY') {
      return { allowed: false, reason: 'Salary transactions cannot be reversed' }
    }
    return { allowed: true }
  }

  /**
   * Check if this is a customer-facing transaction.
   */
  isCustomerTransaction(): boolean {
    return this.customerId !== null
  }

  /**
   * Check if this is a company-level transaction.
   */
  isCompanyTransaction(): boolean {
    return this.customerId === null && this.salaryRecipientAdminId === null
  }

  /**
   * Check if this is a salary payment transaction.
   */
  isSalaryTransaction(): boolean {
    return this.category === 'SALARY' || this.salaryRecipientAdminId !== null
  }

  /**
   * Validate the amount for a new transaction.
   */
  static validateAmount(amount: number): { valid: boolean; reason?: string } {
    if (!Number.isFinite(amount)) {
      return { valid: false, reason: 'Amount must be a finite number' }
    }
    if (amount <= 0) {
      return { valid: false, reason: 'Amount must be positive' }
    }
    if (amount > 1_000_000_000) {
      return { valid: false, reason: 'Amount exceeds maximum allowed' }
    }
    return { valid: true }
  }
}
