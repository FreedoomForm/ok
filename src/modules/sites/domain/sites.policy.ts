/**
 * Sites Policy — Domain layer.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface SitesPolicyUser {
  id: string
  role: AdminRole
}

export class SitesPolicy {
  /**
   * Check if a user can modify a site.
   */
  static canModifySite(user: SitesPolicyUser, siteAdminId: string): { allowed: boolean; reason?: string } {
    if (user.role === 'SUPER_ADMIN') return { allowed: true }
    if (user.id === siteAdminId) return { allowed: true }
    return { allowed: false, reason: 'Not authorized to modify this site' }
  }

  /**
   * Check if a customer can register on a site.
   */
  static canRegisterOnSite(): { allowed: boolean } {
    return { allowed: true }
  }
}
