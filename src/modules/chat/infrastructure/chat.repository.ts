/**
 * Chat Repository — Data access layer for the Chat module.
 *
 * Encapsulates all Prisma queries for conversations and messages, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import type {
  ChatUserDTO,
  ConversationDTO,
  MessageDTO,
  RawConversationDTO,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Admin select for chat user display. */
const CHAT_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const

/** Message sender select (subset of admin fields). */
const MESSAGE_SENDER_SELECT = {
  id: true,
  name: true,
  role: true,
} as const

/** Conversation list select — includes participants and latest message. */
const CONVERSATION_LIST_SELECT = {
  id: true,
  participant1Id: true,
  participant2Id: true,
  lastMessageAt: true,
  participant1: { select: CHAT_USER_SELECT },
  participant2: { select: CHAT_USER_SELECT },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      content: true,
      createdAt: true,
      isRead: true,
      senderId: true,
    },
  },
} as const

/** Message list select — includes sender info. */
const MESSAGE_LIST_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  isRead: true,
  createdAt: true,
  sender: { select: MESSAGE_SENDER_SELECT },
} as const

/** Conversation create select — both participants. */
const CONVERSATION_CREATE_SELECT = {
  id: true,
  participant1Id: true,
  participant2Id: true,
  lastMessageAt: true,
  participant1: { select: CHAT_USER_SELECT },
  participant2: { select: CHAT_USER_SELECT },
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type ConversationListRow = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_LIST_SELECT }>
type MessageListRow = Prisma.MessageGetPayload<{ select: typeof MESSAGE_LIST_SELECT }>
type ConversationCreateRow = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_CREATE_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function toChatUserDTO(row: { id: string; name: string; email: string; role: string }): ChatUserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  }
}

function toConversationDTO(row: ConversationListRow, userId: string): ConversationDTO {
  const otherParticipant = row.participant1Id === userId
    ? toChatUserDTO(row.participant2)
    : toChatUserDTO(row.participant1)

  const lastMessageRow = row.messages[0] || null

  return {
    id: row.id,
    otherParticipant,
    lastMessage: lastMessageRow
      ? {
          content: lastMessageRow.content,
          createdAt: lastMessageRow.createdAt.toISOString(),
          isRead: lastMessageRow.isRead,
          senderId: lastMessageRow.senderId,
        }
      : null,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount: row.messages.filter(m => m.senderId !== userId && !m.isRead).length,
  }
}

function toMessageDTO(row: MessageListRow): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: row.content,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    sender: {
      id: row.sender.id,
      name: row.sender.name,
      role: row.sender.role,
    },
  }
}

function toRawConversationDTO(row: ConversationCreateRow): RawConversationDTO {
  return {
    id: row.id,
    participant1Id: row.participant1Id,
    participant2Id: row.participant2Id,
    lastMessageAt: row.lastMessageAt.toISOString(),
    participant1: toChatUserDTO(row.participant1),
    participant2: toChatUserDTO(row.participant2),
  }
}

// ── Query operations ─────────────────────────────────────────────────────────

/**
 * List conversations for a given user, ordered by lastMessageAt desc.
 */
export async function listConversations(userId: string): Promise<ConversationDTO[]> {
  const rows = await db.conversation.findMany({
    where: {
      OR: [
        { participant1Id: userId },
        { participant2Id: userId },
      ],
    },
    select: CONVERSATION_LIST_SELECT,
    orderBy: { lastMessageAt: 'desc' },
  })

  return rows.map(row => toConversationDTO(row, userId))
}

/**
 * List messages for a conversation with pagination support.
 */
export async function listMessages(
  conversationId: string,
  limit: number,
  before?: string,
): Promise<MessageDTO[]> {
  const rows = await db.message.findMany({
    where: {
      conversationId,
      ...(before && {
        createdAt: { lt: new Date(before) },
      }),
    },
    select: MESSAGE_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Reverse to show oldest first (matching original behavior)
  return rows.reverse().map(toMessageDTO)
}

/**
 * Find a conversation by ID where the user is a participant.
 */
export async function findConversationForUser(
  conversationId: string,
  userId: string,
): Promise<{ id: string } | null> {
  return db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { participant1Id: userId },
        { participant2Id: userId },
      ],
    },
    select: { id: true },
  })
}

/**
 * Find an existing conversation between two participants.
 */
export async function findExistingConversation(
  participant1Id: string,
  participant2Id: string,
): Promise<RawConversationDTO | null> {
  const row = await db.conversation.findFirst({
    where: {
      OR: [
        { participant1Id, participant2Id },
        { participant1Id: participant2Id, participant2Id: participant1Id },
      ],
    },
    select: CONVERSATION_CREATE_SELECT,
  })

  return row ? toRawConversationDTO(row) : null
}

/**
 * List chat users available to the current user based on role hierarchy.
 */
export async function listChatUsers(
  userId: string,
  role: string,
  createdBy: string | null,
): Promise<ChatUserDTO[]> {
  let users: ChatUserDTO[] = []

  if (role === 'SUPER_ADMIN') {
    const rows = await db.admin.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        role: { in: ['MIDDLE_ADMIN', 'COURIER', 'LOW_ADMIN'] },
      },
      select: CHAT_USER_SELECT,
      orderBy: { name: 'asc' },
    })
    users = rows.map(toChatUserDTO)
  } else if (role === 'MIDDLE_ADMIN') {
    // Super admins
    const superAdmins = await db.admin.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: CHAT_USER_SELECT,
    })
    // Created users
    const createdUsers = await db.admin.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        createdBy: userId,
        role: { in: ['COURIER', 'LOW_ADMIN'] },
      },
      select: CHAT_USER_SELECT,
      orderBy: { name: 'asc' },
    })
    users = [...superAdmins, ...createdUsers].map(toChatUserDTO)
  } else if (role === 'COURIER' || role === 'LOW_ADMIN') {
    // Super Admins are always available
    const superAdmins = await db.admin.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: CHAT_USER_SELECT,
    })
    users = [...superAdmins.map(toChatUserDTO)]

    if (createdBy) {
      // Creator
      const creator = await db.admin.findUnique({
        where: { id: createdBy },
        select: CHAT_USER_SELECT,
      })
      if (creator && !users.some(u => u.id === creator.id)) {
        users.push(toChatUserDTO(creator))
      }

      // Peers (same creator)
      const peers = await db.admin.findMany({
        where: {
          id: { not: userId },
          isActive: true,
          createdBy,
          role: { in: ['COURIER', 'LOW_ADMIN'] },
        },
        select: CHAT_USER_SELECT,
        orderBy: { name: 'asc' },
      })
      users = [...users, ...peers.map(toChatUserDTO)]
    }
  }

  return users
}

// ── Command operations ───────────────────────────────────────────────────────

/**
 * Send a message in a conversation.
 */
export async function createMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<MessageDTO> {
  const row = await db.message.create({
    data: {
      conversationId,
      senderId,
      content,
      isRead: false,
    },
    select: MESSAGE_LIST_SELECT,
  })

  // Update conversation's lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })

  return toMessageDTO(row)
}

/**
 * Create a new conversation between two participants.
 */
export async function createConversation(
  participant1Id: string,
  participant2Id: string,
): Promise<RawConversationDTO> {
  const row = await db.conversation.create({
    data: {
      participant1Id,
      participant2Id,
      lastMessageAt: new Date(),
    },
    select: CONVERSATION_CREATE_SELECT,
  })

  return toRawConversationDTO(row)
}

/**
 * Mark all unread messages in a conversation as read for the given user.
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  })
}

/**
 * Find an admin by ID.
 */
export async function findAdminById(id: string) {
  return db.admin.findUnique({
    where: { id },
    select: { id: true, role: true, createdBy: true, isActive: true },
  })
}
