/**
 * Courier Location API Route — Migrated to createApiRoute pattern.
 *
 * POST — Update courier's current location
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeUpdateLocation } from '@/modules/courier'

export const POST = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeUpdateLocation({ user, data: body })
    return { data: result }
  },
})
