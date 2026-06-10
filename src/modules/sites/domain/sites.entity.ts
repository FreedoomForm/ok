/**
 * Site Entity — Domain layer.
 *
 * Encapsulates business rules for site/subdomain operations.
 */

export class SiteEntity {
  constructor(
    public readonly id: string,
    public readonly subdomain: string,
    public readonly adminId: string,
    public readonly chatEnabled: boolean,
    public readonly trialEndsAt: Date | null,
  ) {}

  /**
   * Check if a subdomain is available (entity-level validation only).
   * Actual availability check requires DB access — this is a placeholder
   * for business rules around subdomain naming.
   */
  static isValidSubdomain(subdomain: string): { valid: boolean; reason?: string } {
    if (!subdomain || subdomain.trim().length < 3) {
      return { valid: false, reason: 'Subdomain must be at least 3 characters' }
    }
    if (subdomain.length > 63) {
      return { valid: false, reason: 'Subdomain must be at most 63 characters' }
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
      return { valid: false, reason: 'Subdomain must contain only lowercase letters, numbers, and hyphens' }
    }
    return { valid: true }
  }

  /**
   * Check if the site's subscription is valid.
   * Business rule: if trialEndsAt is null, subscription is perpetual (SUPER_ADMIN).
   * Otherwise, subscription is valid if trialEndsAt is in the future.
   */
  isValidSubscription(asOf: Date = new Date()): boolean {
    if (!this.trialEndsAt) return true
    return this.trialEndsAt > asOf
  }

  /**
   * Check if the site can enable chat.
   */
  canEnableChat(): boolean {
    return this.isValidSubscription()
  }
}
