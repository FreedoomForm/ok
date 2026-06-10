/**
 * Shared Events — barrel export.
 *
 * Provides the outbox pattern infrastructure for domain events.
 */

export { writeToOutbox, type OutboxWritableEvent } from './outbox-writer'

export {
  processOutboxEvents,
  type ProcessOutboxResult,
} from './outbox-publisher'

export {
  registerHandler,
  getHandler,
  clearHandlers,
  type EventHandler,
  type OutboxEventPayload,
} from './event-handlers'
