/**
 * Customer Entity — Domain layer.
 *
 * Encapsulates business rules for customer operations:
 * - Deletion rules (active orders check)
 * - Status toggle rules
 * - Balance validation
 */

import type { PlanType } from '../contracts'

export class CustomerEntity {
  constructor(
    public readonly id: string,
    public readonly isActive: boolean,
    public readonly balance: number,
    public readonly dailyPrice: number,
    public readonly planType: PlanType,
    public readonly autoOrdersEnabled: boolean,
    public readonly activeOrderCount: number = 0,
  ) {}

  /**
   * Check if the customer can be soft-deleted.
   * Business rule: cannot delete if customer has active (non-delivered) orders.
   */
  canBeDeleted(): { allowed: boolean; reason?: string } {
    if (this.activeOrderCount > 0) {
      return { allowed: false, reason: 'Customer has active orders' }
    }
    return { allowed: true }
  }

  /**
   * Check if the customer status can be toggled.
   * Business rule: can always toggle, but deactivating will pause orders.
   */
  canToggleStatus(): { allowed: boolean; reason?: string } {
    return { allowed: true }
  }

  /**
   * Check if the customer can be permanently deleted.
   * Business rule: only SUPER_ADMIN and MIDDLE_ADMIN can permanently delete.
   * This check is for the entity level — role checks are in the policy.
   */
  canBePermanentlyDeleted(): { allowed: boolean; reason?: string } {
    return { allowed: true }
  }

  /**
   * Check if the customer has sufficient balance for an order.
   */
  hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount
  }

  /**
   * Calculate the cost for a given quantity of orders.
   */
  orderCost(quantity: number = 1): number {
    return this.dailyPrice * quantity
  }
}
