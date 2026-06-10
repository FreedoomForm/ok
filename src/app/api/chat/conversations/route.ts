/**
 * Chat Conversations API Route — Migrated to createApiRoute pattern.
 *
 * GET  — List conversations for the current user
 * POST — Create or get existing conversation with a participant
 */

import { createApiRoute } from '@/modules/shared/http'
import {
  executeListConversations,
  executeCreateConversation,
} from '@/modules/chat'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const conversations = await executeListConversations({ user })
    return { data: { conversations } }
  },
})

export const POST = createApiRoute({
  handler: async ({ request, user }) => {
    const body = await request.json()
    const conversation = await executeCreateConversation({ user, data: body })
    return { data: { conversation } }
  },
})
