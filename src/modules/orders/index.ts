/**
 * Orders module — Clean Architecture.
 *
 * This module encapsulates all order-related business logic following
 * a layered architecture:
 *
 * - `domain/`       — Domain entities, policies, errors, and events
 * - `contracts/`    — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Domain
export {
  OrderEntity,
  OrderAlreadyDeliveredError,
  OrderNotDeliverableError,
  OrderPolicy,
  type OrderPolicyUser,
  type OrderPolicyOrder,
  OrderStatusTransitionError,
  OrderTerminalStateError,
  OrderNotAssignedToCourierError,
  OrderMissingFieldsError,
  OrderPaymentValidationError,
  type DomainEvent,
  type OrderCreatedEvent,
  type OrderStatusChangedEvent,
  type OrderCancelledEvent,
  type OrderPaymentUpdatedEvent,
  createOrderCreatedEvent,
  createOrderStatusChangedEvent,
  createOrderCancelledEvent,
  createOrderPaymentUpdatedEvent,
} from './domain'

// Contracts (DTOs)
export type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
  OrderEventType,
  OrderCustomerSnapshot,
  OrderListItem,
  OrderDetail,
  OrderTimelineEvent,
  OrderStats,
  OrderListFilters,
  CustomerOrderTracking,
} from './contracts'

// Application queries
export {
  executeListOrders,
  executeGetOrderDetail,
  executeGetCustomerOrderTracking,
  executeGetOrderStats,
  executeGetOrderTimeline,
  executeBatchGetOrders,
  type ListOrdersQuery,
  type GetOrderDetailQuery,
  type GetCustomerOrderTrackingQuery,
  type GetOrderStatsQuery,
  type GetOrderTimelineQuery,
  type OrderTimelineResult,
  type BatchGetOrdersQuery,
} from './application/queries'

// Application commands
export {
  executeCreateOrder,
  executeUpdateOrderStatus,
  executeSoftDeleteOrders,
  executeRestoreOrders,
  executePermanentDeleteOrders,
  executeBulkUpdateOrders,
  executeReorderOrders,
  type CreateOrderCommand,
  type CreateOrderData,
  type UpdateOrderStatusCommand,
  type UpdateOrderDetailsData,
  type OrderAction,
  type SoftDeleteOrdersCommand,
  type RestoreOrdersCommand,
  type PermanentDeleteOrdersCommand,
  type BulkUpdateOrdersCommand,
  type ReorderItem,
  type ReorderOrdersCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listOrders,
  getOrderDetail,
  getCustomerOrderTracking,
  getOrderTimeline,
  getOrderStats,
  batchGetOrders,
  createOrder,
  updateOrder,
  type ListOrdersInput,
  type GetOrderDetailInput,
  type GetCustomerOrderTrackingInput,
  type GetOrderTimelineInput,
  type GetOrderStatsInput,
  type BatchGetOrdersInput,
  type CreateOrderInput,
  type UpdateOrderInput,
} from './infrastructure'
