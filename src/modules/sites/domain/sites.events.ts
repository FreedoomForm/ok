/**
 * Sites Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'

export interface SiteRegisteredPayload {
  siteId: string
  subdomain: string
  customerId: string
  customerPhone: string
}

export type SiteRegisteredEvent = DomainEvent<'site.registered', SiteRegisteredPayload>

export interface SiteUpdatedPayload {
  siteId: string
  subdomain: string
  updatedFields: string[]
}

export type SiteUpdatedEvent = DomainEvent<'site.updated', SiteUpdatedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createSiteRegisteredEvent(payload: SiteRegisteredPayload): SiteRegisteredEvent {
  return {
    type: 'site.registered',
    aggregateType: 'site',
    aggregateId: payload.siteId,
    payload,
    timestamp: new Date(),
  }
}

export function createSiteUpdatedEvent(payload: SiteUpdatedPayload): SiteUpdatedEvent {
  return {
    type: 'site.updated',
    aggregateType: 'site',
    aggregateId: payload.siteId,
    payload,
    timestamp: new Date(),
  }
}
