// Domain error codes — Backend Design System v1.0 §22
// Stable machine codes for API responses and logging.

export const OrderErrorCodes = {
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_VERSION_CONFLICT: 'ORDER_VERSION_CONFLICT',
  ORDER_STATUS_INVALID_TRANSITION: 'ORDER_STATUS_INVALID_TRANSITION',
  ORDER_CANNOT_ASSIGN_COURIER: 'ORDER_CANNOT_ASSIGN_COURIER',
  ORDER_PERMISSION_DENIED: 'ORDER_PERMISSION_DENIED',
  ORDER_VALIDATION_FAILED: 'ORDER_VALIDATION_FAILED',
  ORDER_CUSTOMER_NOT_FOUND: 'ORDER_CUSTOMER_NOT_FOUND',
  ORDER_NUMBER_EXISTS: 'ORDER_NUMBER_EXISTS',
} as const;

export type OrderErrorCode = keyof typeof OrderErrorCodes;

export class OrderDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OrderDomainError';
  }
}
