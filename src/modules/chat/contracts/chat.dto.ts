/**
 * Chat DTOs — Data Transfer Objects for the Chat module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 */

// ── Chat User ──────────────────────────────────────────────────────────────

export interface ChatUserDTO {
  id: string
  name: string
  email: string
  role: string
}

// ── Conversation ───────────────────────────────────────────────────────────

export interface LastMessageDTO {
  content: string
  createdAt: string
  isRead: boolean
  senderId: string
}

export interface ConversationDTO {
  id: string
  otherParticipant: ChatUserDTO
  lastMessage: LastMessageDTO | null
  lastMessageAt: string
  unreadCount: number
}

// ── Message ────────────────────────────────────────────────────────────────

export interface MessageSenderDTO {
  id: string
  name: string
  role: string
}

export interface MessageDTO {
  id: string
  conversationId: string
  senderId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: MessageSenderDTO
}

// ── Raw Conversation (from create — includes both participants) ────────────

export interface RawConversationDTO {
  id: string
  participant1Id: string
  participant2Id: string
  lastMessageAt: string
  participant1: ChatUserDTO
  participant2: ChatUserDTO
}

// ── Command inputs ─────────────────────────────────────────────────────────

export interface SendMessageData {
  conversationId: string
  content: string
}

export interface CreateConversationData {
  participantId: string
}

export interface MarkMessagesReadData {
  conversationId: string
}
