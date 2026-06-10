/**
 * Chat module — Clean Architecture.
 *
 * This module encapsulates all chat-related business logic following
 * a layered architecture:
 *
 * - `contracts/`   — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Contracts (DTOs)
export type {
  ChatUserDTO,
  ConversationDTO,
  LastMessageDTO,
  MessageDTO,
  MessageSenderDTO,
  RawConversationDTO,
  SendMessageData,
  CreateConversationData,
  MarkMessagesReadData,
} from './contracts'

// Application queries
export {
  executeListConversations,
  executeListMessages,
  executeListChatUsers,
  type ListConversationsQuery,
  type ListMessagesQuery,
  type ListChatUsersQuery,
} from './application/queries'

// Application commands
export {
  executeSendMessage,
  executeCreateConversation,
  executeMarkMessagesRead,
  type SendMessageCommand,
  type CreateConversationCommand,
  type MarkMessagesReadCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listConversations,
  listMessages,
  findConversationForUser,
  findExistingConversation,
  listChatUsers,
  createMessage,
  createConversation,
  markMessagesAsRead,
  findAdminById,
} from './infrastructure'
