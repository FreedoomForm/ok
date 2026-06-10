/**
 * Courier Policy — Domain layer.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface CourierPolicyUser {
  id: string
  role: AdminRole
}

export class CourierPolicy {
  /**
   * Check if a courier can complete an order.
   */
  static canCompleteOrder(user: CourierPolicyUser, orderCourierId: string | null): { allowed: boolean; reason?: string } {
    if (user.role !== 'COURIER') {
      return { allowed: false, reason: 'Only couriers can complete orders' }
    }
    if (orderCourierId !== user.id) {
      return { allowed: false, reason: 'This order is not assigned to you' }
    }
    return { allowed: true }
  }

  /**
   * Check if a courier can request a withdrawal.
   */
  static canRequestWithdrawal(user: CourierPolicyUser): { allowed: boolean; reason?: string } {
    if (user.role !== 'COURIER') {
      return { allowed: false, reason: 'Only couriers can request withdrawals' }
    }
    return { allowed: true }
  }
}
