/**
 * Order Domain Errors — Domain layer.
 *
 * Specific error types for order business rules.
 * Each extends the appropriate base error from shared/errors.
 */

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  ValidationFailedError,
} from '@/modules/shared/errors'

/** Thrown when an order status transition is invalid. */
export class OrderStatusTransitionError extends ConflictError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Invalid order status transition: ${fromStatus} → ${toStatus}`, { fromStatus, toStatus })
    this.name = 'OrderStatusTransitionError'
  }
}

/** Thrown when trying to modify a terminal (delivered/cancelled/failed) order. */
export class OrderTerminalStateError extends ConflictError {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is in terminal state ${status} and cannot be modified`, { orderId, status })
    this.name = 'OrderTerminalStateError'
  }
}

/** Thrown when a courier tries to operate on an order not assigned to them. */
export class OrderNotAssignedToCourierError extends ForbiddenError {
  constructor(orderId: string, courierId: string) {
    super(`Order ${orderId} is not assigned to courier ${courierId}`, { orderId, courierId })
    this.name = 'OrderNotAssignedToCourierError'
  }
}

/** Thrown when order data is missing required fields. */
export class OrderMissingFieldsError extends ValidationFailedError {
  constructor(missingFields: string[]) {
    super(`Missing required order fields: ${missingFields.join(', ')}`, { missingFields })
    this.name = 'OrderMissingFieldsError'
  }
}

/** Thrown when payment data is invalid for an order. */
export class OrderPaymentValidationError extends BadRequestError {
  constructor(reason: string) {
    super(`Payment validation failed: ${reason}`)
    this.name = 'OrderPaymentValidationError'
  }
}

/** Thrown when an order is already delivered and cannot be modified. */
export class OrderAlreadyDeliveredError extends ConflictError {
  constructor(orderId: string) {
    super(`Order ${orderId} is already delivered`, { orderId })
    this.name = 'OrderAlreadyDeliveredError'
  }
}

/** Thrown when an order cannot be delivered due to its current status. */
export class OrderNotDeliverableError extends BadRequestError {
  constructor(currentStatus: string) {
    super(`Order in status ${currentStatus} cannot be delivered`, { currentStatus })
    this.name = 'OrderNotDeliverableError'
  }
}
