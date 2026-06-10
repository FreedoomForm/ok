/**
 * List Conversations Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { listConversations } from '../../infrastructure/chat.repository'
import type { ConversationDTO } from '../../contracts'

export interface ListConversationsQuery {
  user: AuthUser
}

/**
 * Execute the List Conversations query.
 */
export async function executeListConversations(
  query: ListConversationsQuery,
): Promise<ConversationDTO[]> {
  return listConversations(query.user.id)
}
