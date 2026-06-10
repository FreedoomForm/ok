/**
 * Courier Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'

export interface CourierOrderCompletedPayload {
  orderId: string
  courierId: string
  orderStatus: string
}

export type CourierOrderCompletedEvent = DomainEvent<'courier.order-completed', CourierOrderCompletedPayload>

export interface CourierWithdrawalPayload {
  courierId: string
  transactionId: string
  amount: number
  balance: number
}

export type CourierWithdrawalEvent = DomainEvent<'courier.withdrawal', CourierWithdrawalPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createCourierOrderCompletedEvent(payload: CourierOrderCompletedPayload): CourierOrderCompletedEvent {
  return {
    type: 'courier.order-completed',
    aggregateType: 'courier',
    aggregateId: payload.courierId,
    payload,
    timestamp: new Date(),
  }
}

export function createCourierWithdrawalEvent(payload: CourierWithdrawalPayload): CourierWithdrawalEvent {
  return {
    type: 'courier.withdrawal',
    aggregateType: 'courier',
    aggregateId: payload.courierId,
    payload,
    timestamp: new Date(),
  }
}
