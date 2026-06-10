/**
 * Chat Users API Route — Migrated to createApiRoute pattern.
 *
 * GET — List users the current user can chat with based on role hierarchy
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListChatUsers } from '@/modules/chat'

export const GET = createApiRoute({
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListChatUsers({ user, cursor, limit })
    return { data: { users: result.items }, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})
