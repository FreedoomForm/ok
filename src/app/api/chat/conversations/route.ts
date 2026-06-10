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
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListConversations({ user, cursor, limit })
    return { data: { conversations: result.items }, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

export const POST = createApiRoute({
  handler: async ({ request, user }) => {
    const body = await request.json()
    const conversation = await executeCreateConversation({ user, data: body })
    return { data: { conversation } }
  },
})
