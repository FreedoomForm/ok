/**
 * Customer Policy — Domain layer.
 *
 * Authorization policies for customer operations.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface CustomerPolicyUser {
  id: string
  role: AdminRole
}

export interface CustomerPolicyCustomer {
  id: string
  isActive: boolean
  activeOrderCount: number
  createdBy: string | null
}

export class CustomerPolicy {
  /**
   * Check if a user can delete (soft-delete) a customer.
   */
  static canDelete(
    user: CustomerPolicyUser,
    customer: CustomerPolicyCustomer,
    groupAdminIds: string[] | null,
  ): { allowed: boolean; reason?: string } {
    if (user.role === 'SUPER_ADMIN') return { allowed: true }

    // Check group scope
    if (groupAdminIds && customer.createdBy && !groupAdminIds.includes(customer.createdBy)) {
      return { allowed: false, reason: 'Customer not in admin group' }
    }

    return { allowed: true }
  }

  /**
   * Check if a user can toggle customer status.
   */
  static canToggleStatus(
    user: CustomerPolicyUser,
    customer: CustomerPolicyCustomer,
    groupAdminIds: string[] | null,
  ): { allowed: boolean; reason?: string } {
    if (user.role === 'SUPER_ADMIN') return { allowed: true }
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot toggle customer status' }

    if (groupAdminIds && customer.createdBy && groupAdminIds.includes(customer.createdBy)) {
      return { allowed: true }
    }

    return { allowed: false, reason: 'Customer not in admin group' }
  }

  /**
   * Check if a user can permanently delete a customer.
   */
  static canPermanentlyDelete(user: CustomerPolicyUser): { allowed: boolean; reason?: string } {
    if (user.role === 'SUPER_ADMIN' || user.role === 'MIDDLE_ADMIN') return { allowed: true }
    return { allowed: false, reason: 'Only SUPER_ADMIN or MIDDLE_ADMIN can permanently delete customers' }
  }
}
