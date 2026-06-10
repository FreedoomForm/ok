/**
 * Chat Users API Route — Migrated to createApiRoute pattern.
 *
 * GET — List users the current user can chat with based on role hierarchy
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListChatUsers } from '@/modules/chat'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const users = await executeListChatUsers({ user })
    return { data: { users } }
  },
})
