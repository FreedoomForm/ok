/**
 * Outbox Publisher — processes unpublished events from the outbox table.
 *
 * Reads events with status='pending' and attempts < 3,
 * dispatches them to registered handlers, and marks them
 * as published or increments attempts on failure.
 */

import { db } from '@/modules/shared/db'
import { logger } from '@/modules/shared/logger'
import { getHandler } from './event-handlers'

const MAX_ATTEMPTS = 3
const BATCH_SIZE = 50

export interface ProcessOutboxResult {
  processed: number
  published: number
  failed: number
}

/**
 * Process unpublished outbox events.
 *
 * - Reads up to BATCH_SIZE pending events (attempts < MAX_ATTEMPTS)
 * - For each event, finds a registered handler and executes it
 * - On success: marks event as 'published'
 * - On failure: increments attempts; marks as 'failed' if max reached
 *
 * @returns Summary of processing results
 */
export async function processOutboxEvents(): Promise<ProcessOutboxResult> {
  const result: ProcessOutboxResult = {
    processed: 0,
    published: 0,
    failed: 0,
  }

  // Fetch pending events
  const events = await db.outboxEvent.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  })

  if (events.length === 0) return result

  for (const event of events) {
    result.processed++

    try {
      const handler = getHandler(event.eventType)

      if (handler) {
        await handler({
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload as Record<string, unknown>,
          timestamp: event.createdAt,
        })
      } else {
        logger.warn('No handler registered for outbox event', {
          eventType: event.eventType,
          eventId: event.id,
        })
      }

      // Mark as published
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          attempts: { increment: 1 },
        },
      })

      result.published++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const nextAttempts = event.attempts + 1

      logger.error('Failed to process outbox event', {
        eventId: event.id,
        eventType: event.eventType,
        attempts: nextAttempts,
        error: errorMessage,
      })

      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts: nextAttempts,
          status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        },
      })

      result.failed++
    }
  }

  return result
}
