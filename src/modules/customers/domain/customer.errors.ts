/**
 * Customer Domain Errors — Domain layer.
 */

import { ConflictError, ForbiddenError, ValidationFailedError } from '@/modules/shared/errors'

/** Thrown when trying to delete a customer with active orders. */
export class CustomerHasActiveOrdersError extends ConflictError {
  constructor(customerId: string, activeOrderCount: number) {
    super(`Customer ${customerId} has ${activeOrderCount} active orders`, { customerId, activeOrderCount })
    this.name = 'CustomerHasActiveOrdersError'
  }
}

/** Thrown when a user lacks permission to modify a customer. */
export class CustomerNotInGroupError extends ForbiddenError {
  constructor(customerId: string) {
    super(`Customer ${customerId} is not in your admin group`, { customerId })
    this.name = 'CustomerNotInGroupError'
  }
}

/** Thrown when customer data validation fails. */
export class CustomerValidationError extends ValidationFailedError {
  constructor(reason: string) {
    super(`Customer validation failed: ${reason}`)
    this.name = 'CustomerValidationError'
  }
}
