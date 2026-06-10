/**
 * Chat Domain — barrel export.
 */

export {
  ConversationEntity,
} from './chat.entity'

export {
  ChatPolicy,
  type ChatPolicyUser,
} from './chat.policy'

export {
  NotConversationParticipantError,
  InvalidMessageError,
} from './chat.errors'

export {
  type MessageSentEvent,
  type ConversationCreatedEvent,
  type MessageSentPayload,
  type ConversationCreatedPayload,
  createMessageSentEvent,
  createConversationCreatedEvent,
} from './chat.events'
