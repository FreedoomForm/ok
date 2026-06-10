/**
 * Customers Domain — barrel export.
 */

export {
  CustomerEntity,
} from './customer.entity'

export {
  CustomerPolicy,
  type CustomerPolicyUser,
  type CustomerPolicyCustomer,
} from './customer.policy'

export {
  CustomerHasActiveOrdersError,
  CustomerNotInGroupError,
  CustomerValidationError,
} from './customer.errors'

export {
  type CustomerCreatedEvent,
  type CustomerStatusToggledEvent,
  type CustomerDeletedEvent,
  type CustomerCreatedPayload,
  type CustomerStatusToggledPayload,
  type CustomerDeletedPayload,
  createCustomerCreatedEvent,
  createCustomerStatusToggledEvent,
  createCustomerDeletedEvent,
} from './customer.events'
