/**
 * Courier Entity — Domain layer.
 *
 * Encapsulates business rules for courier operations:
 * - Order acceptance
 * - Withdrawal rules
 * - Shift management
 */

export class CourierEntity {
  constructor(
    public readonly id: string,
    public readonly isActive: boolean,
    public readonly isOnShift: boolean,
    public readonly salary: number,
    public readonly createdAt: Date,
    public readonly totalSalaryPaid: number = 0,
  ) {}

  /**
   * Check if the courier can accept a new order.
   * Business rule: must be active, on shift, and have a salary > 0.
   */
  canAcceptOrder(): { allowed: boolean; reason?: string } {
    if (!this.isActive) return { allowed: false, reason: 'Courier is not active' }
    if (!this.isOnShift) return { allowed: false, reason: 'Courier is not on shift' }
    return { allowed: true }
  }

  /**
   * Check if the courier can withdraw a given amount.
   * Business rule: amount must not exceed available balance.
   */
  canWithdraw(amount: number, availableBalance: number): { allowed: boolean; reason?: string } {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { allowed: false, reason: 'Invalid withdrawal amount' }
    }
    if (amount > availableBalance) {
      return { allowed: false, reason: `Amount ${amount} exceeds available balance ${availableBalance}` }
    }
    return { allowed: true }
  }

  /**
   * Calculate accrued salary (days since creation * daily rate).
   */
  accruedSalary(asOf: Date = new Date()): number {
    const days = Math.max(0, Math.floor((asOf.getTime() - this.createdAt.getTime()) / (24 * 60 * 60 * 1000)) + 1)
    return this.salary * days
  }

  /**
   * Calculate available balance (accrued - paid).
   */
  availableBalance(asOf: Date = new Date()): number {
    return this.accruedSalary(asOf) - this.totalSalaryPaid
  }
}
