/**
 * Sites Domain Errors — Domain layer.
 */

import { BadRequestError, ConflictError } from '@/modules/shared/errors'

/** Thrown when a subdomain is invalid or taken. */
export class InvalidSubdomainError extends BadRequestError {
  constructor(subdomain: string, reason: string) {
    super(`Invalid subdomain "${subdomain}": ${reason}`, { subdomain, reason })
    this.name = 'InvalidSubdomainError'
  }
}

/** Thrown when a site's subscription has expired. */
export class SubscriptionExpiredError extends ConflictError {
  constructor(siteId: string) {
    super(`Site ${siteId} subscription has expired`, { siteId })
    this.name = 'SubscriptionExpiredError'
  }
}
