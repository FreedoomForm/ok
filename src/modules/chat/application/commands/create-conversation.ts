/**
 * Create Conversation Command — Application layer.
 *
 * Handles creating a new 1-to-1 conversation or returning an
 * existing one between the current user and a target participant.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { findAdminById, findExistingConversation, createConversation } from '../../infrastructure/chat.repository'
import type { CreateConversationData, RawConversationDTO } from '../../contracts'

export interface CreateConversationCommand {
  user: AuthUser
  data: CreateConversationData
}

/**
 * Execute the Create Conversation command.
 */
export async function executeCreateConversation(
  command: CreateConversationCommand,
): Promise<RawConversationDTO> {
  const { user, data } = command

  if (!data.participantId) {
    throw new BadRequestError('participantId is required')
  }

  // Verify target user exists
  const targetUser = await findAdminById(data.participantId)
  if (!targetUser) {
    throw new NotFoundError('User', data.participantId)
  }

  // Verify current user exists
  const currentUser = await findAdminById(user.id)
  if (!currentUser) {
    throw new NotFoundError('User', user.id)
  }

  // Check if conversation already exists
  const existing = await findExistingConversation(user.id, data.participantId)
  if (existing) {
    return existing
  }

  // Create new conversation
  return createConversation(user.id, data.participantId)
}
