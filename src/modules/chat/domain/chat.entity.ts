/**
 * Conversation Entity — Domain layer.
 *
 * Encapsulates business rules for chat operations.
 */

export class ConversationEntity {
  constructor(
    public readonly id: string,
    public readonly participant1Id: string,
    public readonly participant2Id: string,
  ) {}

  /**
   * Check if a user is a participant in this conversation.
   */
  isParticipant(userId: string): boolean {
    return this.participant1Id === userId || this.participant2Id === userId
  }

  /**
   * Check if a user can send a message in this conversation.
   * Business rule: only participants can send messages.
   */
  canSendMessage(userId: string): { allowed: boolean; reason?: string } {
    if (!this.isParticipant(userId)) {
      return { allowed: false, reason: 'User is not a participant in this conversation' }
    }
    return { allowed: true }
  }

  /**
   * Get the other participant's ID for a given user.
   */
  otherParticipantId(userId: string): string | null {
    if (this.participant1Id === userId) return this.participant2Id
    if (this.participant2Id === userId) return this.participant1Id
    return null
  }
}
