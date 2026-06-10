/**
 * Chat Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'

export interface MessageSentPayload {
  messageId: string
  conversationId: string
  senderId: string
  content: string
}

export type MessageSentEvent = DomainEvent<'chat.message-sent', MessageSentPayload>

export interface ConversationCreatedPayload {
  conversationId: string
  participant1Id: string
  participant2Id: string
}

export type ConversationCreatedEvent = DomainEvent<'chat.conversation-created', ConversationCreatedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createMessageSentEvent(payload: MessageSentPayload): MessageSentEvent {
  return {
    type: 'chat.message-sent',
    aggregateType: 'conversation',
    aggregateId: payload.conversationId,
    payload,
    timestamp: new Date(),
  }
}

export function createConversationCreatedEvent(payload: ConversationCreatedPayload): ConversationCreatedEvent {
  return {
    type: 'chat.conversation-created',
    aggregateType: 'conversation',
    aggregateId: payload.conversationId,
    payload,
    timestamp: new Date(),
  }
}
