/**
 * Event Handler Registry — registers and dispatches outbox event handlers.
 *
 * Provides a simple map-based registry for event handlers.
 * Initial handlers log audit events for key domain events.
 */

import { db } from '@/modules/shared/db'
import { logger } from '@/modules/shared/logger'

// ── Types ──────────────────────────────────────────────────────────────────

export interface OutboxEventPayload {
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  timestamp: Date
}

export type EventHandler = (event: OutboxEventPayload) => Promise<void>

// ── Registry ───────────────────────────────────────────────────────────────

const handlerRegistry = new Map<string, EventHandler>()

/**
 * Register a handler for a specific event type.
 */
export function registerHandler(eventType: string, handler: EventHandler): void {
  handlerRegistry.set(eventType, handler)
}

/**
 * Get a handler for a specific event type.
 * Returns null if no handler is registered.
 */
export function getHandler(eventType: string): EventHandler | null {
  return handlerRegistry.get(eventType) ?? null
}

/**
 * Clear all registered handlers (useful for testing).
 */
export function clearHandlers(): void {
  handlerRegistry.clear()
}

// ── Initial Handlers ───────────────────────────────────────────────────────

/**
 * Handler for order.created events.
 * Logs an audit event for the new order.
 */
registerHandler('order.created', async (event) => {
  logger.info('Domain event: order.created', { aggregateId: event.aggregateId })

  // Write to action_logs for audit trail
  try {
    await db.actionLog.create({
      data: {
        adminId: (event.payload.actorAdminId as string) || 'system',
        action: 'ORDER_CREATED_EVENT',
        entityType: 'ORDER',
        entityId: event.aggregateId,
        description: `Order created (domain event)`,
        details: JSON.stringify(event.payload),
      },
    })
  } catch (error) {
    logger.error('Failed to log order.created audit event', { error: error instanceof Error ? error.message : String(error) })
  }
})

/**
 * Handler for order.status-changed events.
 * Logs an audit event for the status change.
 */
registerHandler('order.status-changed', async (event) => {
  logger.info('Domain event: order.status-changed', {
    aggregateId: event.aggregateId,
    previousStatus: event.payload.previousStatus,
    newStatus: event.payload.newStatus,
  })

  try {
    await db.actionLog.create({
      data: {
        adminId: (event.payload.actorAdminId as string) || 'system',
        action: 'ORDER_STATUS_CHANGED_EVENT',
        entityType: 'ORDER',
        entityId: event.aggregateId,
        description: `Order status changed from ${event.payload.previousStatus} to ${event.payload.newStatus}`,
        details: JSON.stringify(event.payload),
      },
    })
  } catch (error) {
    logger.error('Failed to log order.status-changed audit event', { error: error instanceof Error ? error.message : String(error) })
  }
})

/**
 * Handler for transaction.created events.
 * Logs an audit event for the new transaction.
 */
registerHandler('transaction.created', async (event) => {
  logger.info('Domain event: transaction.created', { aggregateId: event.aggregateId })

  try {
    await db.actionLog.create({
      data: {
        adminId: (event.payload.adminId as string) || 'system',
        action: 'TRANSACTION_CREATED_EVENT',
        entityType: 'TRANSACTION',
        entityId: event.aggregateId,
        description: `Transaction created (domain event)`,
        details: JSON.stringify(event.payload),
      },
    })
  } catch (error) {
    logger.error('Failed to log transaction.created audit event', { error: error instanceof Error ? error.message : String(error) })
  }
})
