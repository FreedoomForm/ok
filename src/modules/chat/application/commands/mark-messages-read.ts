/**
 * Mark Messages Read Command — Application layer.
 *
 * Marks all unread messages in a conversation as read for
 * the current user.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { findConversationForUser, markMessagesAsRead } from '../../infrastructure/chat.repository'
import type { MarkMessagesReadData } from '../../contracts'

export interface MarkMessagesReadCommand {
  user: AuthUser
  data: MarkMessagesReadData
}

/**
 * Execute the Mark Messages Read command.
 */
export async function executeMarkMessagesRead(
  command: MarkMessagesReadCommand,
): Promise<{ success: boolean }> {
  const { user, data } = command

  if (!data.conversationId) {
    throw new BadRequestError('conversationId is required')
  }

  // Verify user is participant
  const conversation = await findConversationForUser(data.conversationId, user.id)
  if (!conversation) {
    throw new NotFoundError('Conversation', data.conversationId)
  }

  await markMessagesAsRead(data.conversationId, user.id)

  return { success: true }
}
