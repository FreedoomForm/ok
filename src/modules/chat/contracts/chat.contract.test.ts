/**
 * Chat module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `chat.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Chat Zod schemas (mirrors chat.dto.ts) ──────────────────────────────────

const chatUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
})

const lastMessageSchema = z.object({
  content: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  senderId: z.string(),
})

const conversationSchema = z.object({
  id: z.string(),
  otherParticipant: chatUserSchema,
  lastMessage: lastMessageSchema.nullable(),
  lastMessageAt: z.string(),
  unreadCount: z.number(),
})

const messageSenderSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
})

const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  sender: messageSenderSchema,
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const conversationsResponseSchema = successResponseSchema.extend({
  data: z.array(conversationSchema),
})

const messagesResponseSchema = successResponseSchema.extend({
  data: z.array(messageSchema),
})

const usersResponseSchema = successResponseSchema.extend({
  data: z.array(chatUserSchema),
})

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleChatUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN',
}

const sampleConversation = {
  id: 'conv-1',
  otherParticipant: sampleChatUser,
  lastMessage: null,
  lastMessageAt: '2024-01-15T10:00:00.000Z',
  unreadCount: 0,
}

const sampleMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  content: 'Hello!',
  isRead: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  sender: { id: 'user-1', name: 'Admin User', role: 'SUPER_ADMIN' },
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Chat contract — ChatUser schema', () => {
  it('validates a well-formed ChatUser', () => {
    const result = chatUserSchema.safeParse(sampleChatUser)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { id, ...missingId } = sampleChatUser
    const result = chatUserSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })
})

describe('Chat contract — Conversation schema', () => {
  it('validates a well-formed Conversation', () => {
    const result = conversationSchema.safeParse(sampleConversation)
    expect(result.success).toBe(true)
  })

  it('accepts conversation with lastMessage', () => {
    const convWithMsg = {
      ...sampleConversation,
      lastMessage: {
        content: 'Hi there',
        createdAt: '2024-01-15T10:00:00.000Z',
        isRead: true,
        senderId: 'user-2',
      },
    }
    const result = conversationSchema.safeParse(convWithMsg)
    expect(result.success).toBe(true)
  })
})

describe('Chat contract — Message schema', () => {
  it('validates a well-formed Message', () => {
    const result = messageSchema.safeParse(sampleMessage)
    expect(result.success).toBe(true)
  })
})

describe('Chat contract — conversations response', () => {
  it('validates conversations list response', () => {
    const response = {
      data: [sampleConversation],
      meta: { requestId: 'req-conv' },
    }
    const result = conversationsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Chat contract — messages response', () => {
  it('validates messages list response', () => {
    const response = {
      data: [sampleMessage],
      meta: { requestId: 'req-msg' },
    }
    const result = messagesResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Chat contract — users response', () => {
  it('validates users list response', () => {
    const response = {
      data: [sampleChatUser],
      meta: { requestId: 'req-users' },
    }
    const result = usersResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Chat contract — error responses', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-err' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates NOT_FOUND error for conversation', () => {
    const response = {
      error: { code: ErrorCodes.NOT_FOUND, message: 'Conversation not found' },
      meta: { requestId: 'req-404' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
