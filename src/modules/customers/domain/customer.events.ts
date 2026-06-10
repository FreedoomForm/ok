/**
 * Customer Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'
import type { PlanType } from '../contracts'

export interface CustomerCreatedPayload {
  customerId: string
  name: string
  phone: string
  planType: PlanType
  createdBy: string | null
}

export type CustomerCreatedEvent = DomainEvent<'customer.created', CustomerCreatedPayload>

export interface CustomerStatusToggledPayload {
  customerId: string
  isActive: boolean
  toggledBy: string
}

export type CustomerStatusToggledEvent = DomainEvent<'customer.status-toggled', CustomerStatusToggledPayload>

export interface CustomerDeletedPayload {
  customerId: string
  deletedBy: string
  permanent: boolean
}

export type CustomerDeletedEvent = DomainEvent<'customer.deleted', CustomerDeletedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createCustomerCreatedEvent(payload: CustomerCreatedPayload): CustomerCreatedEvent {
  return {
    type: 'customer.created',
    aggregateType: 'customer',
    aggregateId: payload.customerId,
    payload,
    timestamp: new Date(),
  }
}

export function createCustomerStatusToggledEvent(payload: CustomerStatusToggledPayload): CustomerStatusToggledEvent {
  return {
    type: 'customer.status-toggled',
    aggregateType: 'customer',
    aggregateId: payload.customerId,
    payload,
    timestamp: new Date(),
  }
}

export function createCustomerDeletedEvent(payload: CustomerDeletedPayload): CustomerDeletedEvent {
  return {
    type: 'customer.deleted',
    aggregateType: 'customer',
    aggregateId: payload.customerId,
    payload,
    timestamp: new Date(),
  }
}
