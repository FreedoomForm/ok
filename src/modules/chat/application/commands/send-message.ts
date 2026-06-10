/**
 * Send Message Command — Application layer.
 *
 * Handles sending a new message in a conversation with validation
 * and participant verification.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { findConversationForUser, createMessage } from '../../infrastructure/chat.repository'
import type { SendMessageData, MessageDTO } from '../../contracts'

export interface SendMessageCommand {
  user: AuthUser
  data: SendMessageData
}

/**
 * Execute the Send Message command.
 */
export async function executeSendMessage(
  command: SendMessageCommand,
): Promise<MessageDTO> {
  const { user, data } = command

  if (!data.conversationId || !data.content) {
    throw new BadRequestError('conversationId and content are required')
  }

  if (data.content.trim().length === 0) {
    throw new BadRequestError('Message cannot be empty')
  }

  if (data.content.length > 5000) {
    throw new BadRequestError('Message too long (max 5000 characters)')
  }

  // Verify user is participant in this conversation
  const conversation = await findConversationForUser(data.conversationId, user.id)
  if (!conversation) {
    throw new NotFoundError('Conversation', data.conversationId)
  }

  return createMessage(data.conversationId, user.id, data.content.trim())
}
