/**
 * Chat Send Message API Route — Migrated to createApiRoute pattern.
 *
 * POST — Send a new message in a conversation
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeSendMessage } from '@/modules/chat'

export const POST = createApiRoute({
  handler: async ({ request, user }) => {
    const body = await request.json()
    const message = await executeSendMessage({ user, data: body })
    return { data: { message } }
  },
})
