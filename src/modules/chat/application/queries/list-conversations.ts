/**
 * List Conversations Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { listConversations } from '../../infrastructure/chat.repository'
import type { ConversationDTO } from '../../contracts'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListConversationsQuery {
  user: AuthUser
  cursor?: string
  limit?: number
}

/**
 * Execute the List Conversations query.
 */
export async function executeListConversations(
  query: ListConversationsQuery,
): Promise<PaginatedResult<ConversationDTO>> {
  return listConversations(query.user.id, query.cursor, query.limit)
}
