/**
 * List Chat Users Query — Application layer.
 *
 * Returns the list of users the current user can chat with,
 * based on role hierarchy scoping.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { NotFoundError } from '@/modules/shared/errors'
import { listChatUsers, findAdminById } from '../../infrastructure/chat.repository'
import type { ChatUserDTO } from '../../contracts'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListChatUsersQuery {
  user: AuthUser
  cursor?: string
  limit?: number
}

/**
 * Execute the List Chat Users query.
 */
export async function executeListChatUsers(
  query: ListChatUsersQuery,
): Promise<PaginatedResult<ChatUserDTO>> {
  const currentUser = await findAdminById(query.user.id)
  if (!currentUser) {
    throw new NotFoundError('User', query.user.id)
  }

  return listChatUsers(query.user.id, currentUser.role, currentUser.createdBy, query.cursor, query.limit)
}
