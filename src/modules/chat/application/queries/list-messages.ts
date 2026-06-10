/**
 * List Messages Query — Application layer.
 *
 * Fetches messages for a conversation after verifying the user
 * is a participant.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { NotFoundError, BadRequestError } from '@/modules/shared/errors'
import { listMessages, findConversationForUser } from '../../infrastructure/chat.repository'
import type { MessageDTO } from '../../contracts'

export interface ListMessagesQuery {
  user: AuthUser
  conversationId: string
  limit?: number
  before?: string
}

/**
 * Execute the List Messages query.
 */
export async function executeListMessages(
  query: ListMessagesQuery,
): Promise<MessageDTO[]> {
  const { user, conversationId, limit = 50, before } = query

  if (!conversationId) {
    throw new BadRequestError('conversationId is required')
  }

  // Verify user is participant in this conversation
  const conversation = await findConversationForUser(conversationId, user.id)
  if (!conversation) {
    throw new NotFoundError('Conversation', conversationId)
  }

  return listMessages(conversationId, limit, before)
}
