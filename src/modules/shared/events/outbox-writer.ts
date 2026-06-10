/**
 * Outbox Writer — writes domain events to the outbox table.
 *
 * MUST be called within the same Prisma transaction as the
 * operation that generated the events, ensuring atomicity.
 */

import type { PrismaClient, Prisma } from '@prisma/client'

/**
 * Minimal shape of a domain event that can be written to the outbox.
 * Accepts any event with the required fields.
 */
export interface OutboxWritableEvent {
  type: string
  aggregateType: string
  aggregateId: string
  payload: unknown
  timestamp: Date
}

/**
 * Write domain events to the outbox_events table within a transaction.
 *
 * @param tx - Prisma transaction client (from $transaction callback)
 * @param events - Array of domain events to persist
 *
 * @example
 * ```ts
 * await db.$transaction(async (tx) => {
 *   await tx.order.create({ data: ... })
 *   await writeToOutbox(tx, [createOrderCreatedEvent({ ... })])
 * })
 * ```
 */
export async function writeToOutbox(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  events: OutboxWritableEvent[],
): Promise<void> {
  if (!events || events.length === 0) return

  await tx.outboxEvent.createMany({
    data: events.map((event) => ({
      eventType: event.type,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload as Prisma.InputJsonValue,
      status: 'pending',
      attempts: 0,
    })),
  })
}
