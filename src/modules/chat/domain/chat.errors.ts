/**
 * Chat Domain Errors — Domain layer.
 */

import { ForbiddenError, BadRequestError } from '@/modules/shared/errors'

/** Thrown when a user tries to send a message to a conversation they're not part of. */
export class NotConversationParticipantError extends ForbiddenError {
  constructor(conversationId: string, userId: string) {
    super(`User ${userId} is not a participant in conversation ${conversationId}`, { conversationId, userId })
    this.name = 'NotConversationParticipantError'
  }
}

/** Thrown when a message is invalid. */
export class InvalidMessageError extends BadRequestError {
  constructor(reason: string) {
    super(`Invalid message: ${reason}`)
    this.name = 'InvalidMessageError'
  }
}
