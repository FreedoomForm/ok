/**
 * Finance Policy — Domain layer.
 *
 * Authorization policies for financial operations.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface FinancePolicyUser {
  id: string
  role: AdminRole
}

export class FinancePolicy {
  /**
   * Check if a user can create a transaction.
   */
  static canCreateTransaction(user: FinancePolicyUser): { allowed: boolean; reason?: string } {
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot create transactions' }
    if (user.role === 'WORKER') return { allowed: false, reason: 'Workers cannot create transactions' }
    return { allowed: true }
  }

  /**
   * Check if a user can pay salary.
   */
  static canPaySalary(user: FinancePolicyUser): { allowed: boolean; reason?: string } {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
      return { allowed: false, reason: 'Only SUPER_ADMIN or MIDDLE_ADMIN can pay salary' }
    }
    return { allowed: true }
  }

  /**
   * Check if a user can buy ingredients.
   */
  static canBuyIngredients(user: FinancePolicyUser): { allowed: boolean; reason?: string } {
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot buy ingredients' }
    if (user.role === 'WORKER') return { allowed: false, reason: 'Workers cannot buy ingredients' }
    return { allowed: true }
  }
}
