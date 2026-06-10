/**
 * Chat Policy — Domain layer.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'

export interface ChatPolicyUser {
  id: string
  role: AdminRole
}

export class ChatPolicy {
  /**
   * Check if a user can send a message.
   */
  static canSendMessage(user: ChatPolicyUser, conversation: { participant1Id: string; participant2Id: string }): { allowed: boolean; reason?: string } {
    if (user.id !== conversation.participant1Id && user.id !== conversation.participant2Id) {
      return { allowed: false, reason: 'Not a conversation participant' }
    }
    return { allowed: true }
  }

  /**
   * Check if a user can create a conversation.
   */
  static canCreateConversation(_user: ChatPolicyUser): { allowed: boolean; reason?: string } {
    return { allowed: true }
  }
}
