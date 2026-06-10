/**
 * Admins Policy — Domain layer.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface AdminPolicyUser {
  id: string
  role: AdminRole
}

export interface AdminPolicyTarget {
  id: string
  role: AdminRole
  createdBy: string | null
}

export class AdminPolicy {
  /**
   * Check if a user can create a subordinate admin.
   */
  static canCreateSubordinate(user: AdminPolicyUser, targetRole: AdminRole): { allowed: boolean; reason?: string } {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
      return { allowed: false, reason: 'Only SUPER_ADMIN or MIDDLE_ADMIN can create subordinates' }
    }

    const validRoles: AdminRole[] = ['LOW_ADMIN', 'COURIER', 'WORKER']
    if (!validRoles.includes(targetRole)) {
      return { allowed: false, reason: `Cannot create admin with role ${targetRole}` }
    }

    return { allowed: true }
  }

  /**
   * Check if a user can delete an admin.
   */
  static canDeleteAdmin(user: AdminPolicyUser, target: AdminPolicyTarget): { allowed: boolean; reason?: string } {
    if (user.id === target.id) return { allowed: false, reason: 'Cannot delete yourself' }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
      return { allowed: false, reason: 'Only SUPER_ADMIN or MIDDLE_ADMIN can delete admins' }
    }
    if (user.role === 'MIDDLE_ADMIN' && target.createdBy !== user.id) {
      return { allowed: false, reason: 'MIDDLE_ADMIN can only delete admins they created' }
    }
    return { allowed: true }
  }

  /**
   * Check if a user can toggle an admin's status.
   */
  static canToggleStatus(user: AdminPolicyUser, target: AdminPolicyTarget): { allowed: boolean; reason?: string } {
    if (user.id === target.id) return { allowed: false, reason: 'Cannot toggle your own status' }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
      return { allowed: false, reason: 'Only SUPER_ADMIN or MIDDLE_ADMIN can toggle status' }
    }
    return { allowed: true }
  }
}
