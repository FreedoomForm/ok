/**
 * Orders module — Clean Architecture.
 *
 * This module encapsulates all order-related business logic following
 * a layered architecture:
 *
 * - `contracts/`   — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

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
} from './contracts'

// Application queries
export {
  executeListOrders,
  executeGetOrderDetail,
  executeGetOrderStats,
  executeGetOrderTimeline,
  type ListOrdersQuery,
  type GetOrderDetailQuery,
  type GetOrderStatsQuery,
  type GetOrderTimelineQuery,
  type OrderTimelineResult,
} from './application/queries'

// Application commands
export {
  executeCreateOrder,
  executeUpdateOrderStatus,
  executeSoftDeleteOrders,
  executeRestoreOrders,
  executePermanentDeleteOrders,
  executeBulkUpdateOrders,
  type CreateOrderCommand,
  type CreateOrderData,
  type UpdateOrderStatusCommand,
  type UpdateOrderDetailsData,
  type OrderAction,
  type SoftDeleteOrdersCommand,
  type RestoreOrdersCommand,
  type PermanentDeleteOrdersCommand,
  type BulkUpdateOrdersCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listOrders,
  getOrderDetail,
  getOrderTimeline,
  getOrderStats,
  createOrder,
  updateOrder,
  type ListOrdersInput,
  type GetOrderDetailInput,
  type GetOrderTimelineInput,
  type GetOrderStatsInput,
  type CreateOrderInput,
  type UpdateOrderInput,
} from './infrastructure'
