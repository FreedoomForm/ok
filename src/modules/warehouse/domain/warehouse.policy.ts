/**
 * Warehouse Policy — Domain layer.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface WarehousePolicyUser {
  id: string
  role: AdminRole
}

export class WarehousePolicy {
  /**
   * Check if a user can manage warehouse (ingredients, dishes).
   */
  static canManageWarehouse(user: WarehousePolicyUser): { allowed: boolean; reason?: string } {
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot manage warehouse' }
    if (user.role === 'WORKER') return { allowed: false, reason: 'Workers cannot manage warehouse' }
    return { allowed: true }
  }

  /**
   * Check if a user can execute cooking operations.
   */
  static canCook(user: WarehousePolicyUser): { allowed: boolean; reason?: string } {
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot cook' }
    return { allowed: true }
  }
}
