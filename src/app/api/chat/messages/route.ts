/**
 * Chat Messages API Route — Migrated to createApiRoute pattern.
 *
 * GET   — List messages for a conversation
 * PATCH — Mark messages as read in a conversation
 */

import { createApiRoute } from '@/modules/shared/http'
import {
  executeListMessages,
  executeMarkMessagesRead,
} from '@/modules/chat'

export const GET = createApiRoute({
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') || undefined
    const cursor = searchParams.get('cursor') || undefined

    const result = await executeListMessages({
      user,
      conversationId,
      limit,
      before,
      cursor,
    })

    return { data: { messages: result.items }, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

export const PATCH = createApiRoute({
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeMarkMessagesRead({ user, data: body })
    return { data: result }
  },
})
