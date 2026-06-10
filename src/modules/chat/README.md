# Chat Module

Real-time messaging for the AutoFood delivery platform.

## Purpose

Handles 1-to-1 conversations between platform users (admins, couriers, workers), message sending, read/unread state management, and conversation listing. Role-based scoping determines which users can chat with each other.

## Directory Structure

```
src/modules/chat/
├── contracts/
│   ├── chat.dto.ts         # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── chat.repository.ts  # Prisma queries with select presets + transformers
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── list-conversations.ts  # List user's conversations
│   │   ├── list-messages.ts       # List messages in a conversation
│   │   ├── list-chat-users.ts     # List available chat partners
│   │   └── index.ts
│   ├── commands/
│   │   ├── send-message.ts        # Send a message
│   │   ├── create-conversation.ts # Start a new conversation
│   │   ├── mark-messages-read.ts  # Mark messages as read
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeListConversations(query)` | List conversations for current user with unread counts |
| `executeListMessages(query)` | List messages in a conversation with pagination |
| `executeListChatUsers(query)` | List available chat partners based on role |

### Commands
| Function | Description |
|---|---|
| `executeSendMessage(command)` | Send a message in an existing conversation |
| `executeCreateConversation(command)` | Start a new 1-to-1 conversation |
| `executeMarkMessagesRead(command)` | Mark all unread messages in a conversation as read |

### Infrastructure
| Function | Description |
|---|---|
| `listConversations()` | Raw conversation list |
| `listMessages()` | Raw message list |
| `findConversationForUser()` | Find conversation by ID with participant check |
| `findExistingConversation()` | Find conversation between two users |
| `listChatUsers()` | Raw chat user list |
| `createMessage()` | Raw Prisma create |
| `createConversation()` | Raw Prisma create |
| `markMessagesAsRead()` | Raw Prisma update |
| `findAdminById()` | Find admin for participant verification |

## Key DTOs

| DTO | Purpose |
|---|---|
| `ChatUserDTO` | User available for chat (id, name, email, role) |
| `ConversationDTO` | Conversation with other participant + last message + unread count |
| `MessageDTO` | Message with sender info |
| `RawConversationDTO` | Newly created conversation with both participants |
| `LastMessageDTO` | Last message preview in conversation list |
| `MessageSenderDTO` | Message sender (id, name, role) |
| `SendMessageData` | Input for sending a message |
| `CreateConversationData` | Input for creating a conversation |
| `MarkMessagesReadData` | Input for marking messages as read |

## Role-Based Scoping Rules

| Role | Can Chat With |
|---|---|
| `SUPER_ADMIN` | All users on the platform |
| `MIDDLE_ADMIN` | SUPER_ADMIN + all admins/couriers they created |
| `LOW_ADMIN` | SUPER_ADMIN + creator + peers in same group |
| `COURIER` | SUPER_ADMIN + creator + peers in same group |
| `WORKER` | SUPER_ADMIN + creator |

## Notes

- Socket.io integration is not used in the current chat API routes (polling-based).
- The chat module only handles server-side application logic; real-time events would be handled separately.
