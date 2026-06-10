/**
 * Order Domain Events — Domain layer.
 *
 * Typed event definitions for order lifecycle operations.
 * These events are written to the outbox table within
 * the same DB transaction as the operation.
 */

import type { OrderStatus, PaymentStatus } from '../contracts'

// ── Base domain event ──────────────────────────────────────────────────────

export interface DomainEvent<T extends string = string, P = unknown> {
  type: T
  aggregateType: string
  aggregateId: string
  payload: P
  timestamp: Date
}

// ── Order events ───────────────────────────────────────────────────────────

export interface OrderCreatedPayload {
  orderId: string
  orderNumber: number
  customerId: string
  adminId: string | null
  courierId: string | null
  orderStatus: OrderStatus
  sourceChannel: string | null
  priority: number
}

export type OrderCreatedEvent = DomainEvent<'order.created', OrderCreatedPayload>

export interface OrderStatusChangedPayload {
  orderId: string
  orderNumber: number
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  actorAdminId: string | null
  actorRole: string | null
  courierId: string | null
}

export type OrderStatusChangedEvent = DomainEvent<'order.status-changed', OrderStatusChangedPayload>

export interface OrderCancelledPayload {
  orderId: string
  orderNumber: number
  previousStatus: OrderStatus
  cancelledBy: string | null
  reason?: string
}

export type OrderCancelledEvent = DomainEvent<'order.cancelled', OrderCancelledPayload>

export interface OrderPaymentUpdatedPayload {
  orderId: string
  orderNumber: number
  paymentStatus: PaymentStatus
  amountReceived: number | null
  totalCost: number
}

export type OrderPaymentUpdatedEvent = DomainEvent<'order.payment-updated', OrderPaymentUpdatedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createOrderCreatedEvent(payload: OrderCreatedPayload): OrderCreatedEvent {
  return {
    type: 'order.created',
    aggregateType: 'order',
    aggregateId: payload.orderId,
    payload,
    timestamp: new Date(),
  }
}

export function createOrderStatusChangedEvent(payload: OrderStatusChangedPayload): OrderStatusChangedEvent {
  return {
    type: 'order.status-changed',
    aggregateType: 'order',
    aggregateId: payload.orderId,
    payload,
    timestamp: new Date(),
  }
}

export function createOrderCancelledEvent(payload: OrderCancelledPayload): OrderCancelledEvent {
  return {
    type: 'order.cancelled',
    aggregateType: 'order',
    aggregateId: payload.orderId,
    payload,
    timestamp: new Date(),
  }
}

export function createOrderPaymentUpdatedEvent(payload: OrderPaymentUpdatedPayload): OrderPaymentUpdatedEvent {
  return {
    type: 'order.payment-updated',
    aggregateType: 'order',
    aggregateId: payload.orderId,
    payload,
    timestamp: new Date(),
  }
}
