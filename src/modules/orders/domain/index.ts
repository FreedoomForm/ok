/**
 * Orders Domain — barrel export.
 */

export {
  OrderEntity,
  OrderAlreadyDeliveredError,
  OrderNotDeliverableError,
} from './order.entity'

export {
  OrderPolicy,
  type OrderPolicyUser,
  type OrderPolicyOrder,
} from './order.policy'

export {
  OrderStatusTransitionError,
  OrderTerminalStateError,
  OrderNotAssignedToCourierError,
  OrderMissingFieldsError,
  OrderPaymentValidationError,
} from './order.errors'

export {
  type DomainEvent,
  type OrderCreatedEvent,
  type OrderStatusChangedEvent,
  type OrderCancelledEvent,
  type OrderPaymentUpdatedEvent,
  type OrderCreatedPayload,
  type OrderStatusChangedPayload,
  type OrderCancelledPayload,
  type OrderPaymentUpdatedPayload,
  createOrderCreatedEvent,
  createOrderStatusChangedEvent,
  createOrderCancelledEvent,
  createOrderPaymentUpdatedEvent,
} from './order.events'
