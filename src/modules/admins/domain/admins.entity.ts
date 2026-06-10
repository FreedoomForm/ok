/**
 * Admin Entity — Domain layer.
 *
 * Encapsulates business rules for admin management:
 * - Subordinate creation rules
 * - Deletion rules
 * - Role hierarchy
 */

import { ADMIN_ROLE_LEVEL, type AdminRole } from '@/modules/shared/auth/roles'

export class AdminEntity {
  constructor(
    public readonly id: string,
    public readonly role: AdminRole,
    public readonly isActive: boolean,
    public readonly createdBy: string | null,
  ) {}

  /**
   * Check if this admin can create a subordinate with the given role.
   * Business rule: admin level must be higher than the subordinate's level.
   */
  canCreateSubordinate(role: AdminRole): { allowed: boolean; reason?: string } {
    const myLevel = ADMIN_ROLE_LEVEL[this.role]
    const subordinateLevel = ADMIN_ROLE_LEVEL[role]

    if (myLevel <= subordinateLevel) {
      return { allowed: false, reason: `Role ${this.role} cannot create ${role}` }
    }

    // SUPER_ADMIN can create MIDDLE_ADMIN, LOW_ADMIN, COURIER, WORKER
    // MIDDLE_ADMIN can create LOW_ADMIN, COURIER, WORKER
    // Others cannot create subordinates
    if (this.role !== 'SUPER_ADMIN' && this.role !== 'MIDDLE_ADMIN') {
      return { allowed: false, reason: `${this.role} cannot create subordinates` }
    }

    return { allowed: true }
  }

  /**
   * Check if this admin can be deleted by the requesting user.
   * Business rule: cannot delete yourself; must be higher role or creator.
   */
  canBeDeleted(deleterRole: AdminRole, deleterId: string): { allowed: boolean; reason?: string } {
    if (this.id === deleterId) {
      return { allowed: false, reason: 'Cannot delete yourself' }
    }

    const deleterLevel = ADMIN_ROLE_LEVEL[deleterRole]
    const targetLevel = ADMIN_ROLE_LEVEL[this.role]

    if (deleterLevel <= targetLevel) {
      return { allowed: false, reason: `Role ${deleterRole} cannot delete ${this.role}` }
    }

    return { allowed: true }
  }

  /**
   * Check if this admin's status can be toggled.
   */
  canToggleStatus(togglerRole: AdminRole, togglerId: string): { allowed: boolean; reason?: string } {
    if (this.id === togglerId) {
      return { allowed: false, reason: 'Cannot toggle your own status' }
    }

    const togglerLevel = ADMIN_ROLE_LEVEL[togglerRole]
    const targetLevel = ADMIN_ROLE_LEVEL[this.role]

    if (togglerLevel <= targetLevel) {
      return { allowed: false, reason: `Role ${togglerRole} cannot toggle ${this.role}` }
    }

    return { allowed: true }
  }

  /**
   * Check if this is a high-level admin (SUPER_ADMIN or MIDDLE_ADMIN).
   */
  isHighLevel(): boolean {
    return this.role === 'SUPER_ADMIN' || this.role === 'MIDDLE_ADMIN'
  }
}
