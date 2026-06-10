/**
 * Admins Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'

export interface AdminCreatedPayload {
  adminId: string
  name: string
  email: string
  role: string
  createdBy: string | null
}

export type AdminCreatedEvent = DomainEvent<'admin.created', AdminCreatedPayload>

export interface AdminDeletedPayload {
  adminId: string
  deletedBy: string
}

export type AdminDeletedEvent = DomainEvent<'admin.deleted', AdminDeletedPayload>

export interface AdminStatusToggledPayload {
  adminId: string
  isActive: boolean
  toggledBy: string
}

export type AdminStatusToggledEvent = DomainEvent<'admin.status-toggled', AdminStatusToggledPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createAdminCreatedEvent(payload: AdminCreatedPayload): AdminCreatedEvent {
  return {
    type: 'admin.created',
    aggregateType: 'admin',
    aggregateId: payload.adminId,
    payload,
    timestamp: new Date(),
  }
}

export function createAdminDeletedEvent(payload: AdminDeletedPayload): AdminDeletedEvent {
  return {
    type: 'admin.deleted',
    aggregateType: 'admin',
    aggregateId: payload.adminId,
    payload,
    timestamp: new Date(),
  }
}

export function createAdminStatusToggledEvent(payload: AdminStatusToggledPayload): AdminStatusToggledEvent {
  return {
    type: 'admin.status-toggled',
    aggregateType: 'admin',
    aggregateId: payload.adminId,
    payload,
    timestamp: new Date(),
  }
}
