// Public API of orders module — Backend Design System v1.0 §11
// Only export what other modules should use. Do NOT export internals.

export { CreateOrderHandler, type CreateOrderInput } from '../application/commands/create-order.command';
export { ListOrdersHandler, type ListOrdersInput } from '../application/queries/list-orders.query';
export { Order } from '../domain/order.entity';
export { OrderPolicy, type UserContext } from '../domain/order.policy';
export { OrderDomainError, OrderErrorCodes } from '../domain/order.errors';
export { OrderCreatedEvent, OrderStatusChangedEvent, CourierAssignedEvent } from '../domain/order.events';
export type { OrderSummary, OrderListItem, OrderDetail, PaginatedOrders, OrderAuditEventSummary } from '../contracts/order.dto';
export type { OrderRepository } from '../infrastructure/repositories/order.repository';
export type { OrderReadModel } from '../infrastructure/repositories/order.read-model';
export { OrderMapper } from '../infrastructure/mappers/order.mapper';
