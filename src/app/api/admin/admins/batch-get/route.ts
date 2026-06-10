/**
 * POST /api/admin/admins/batch-get — Batch fetch admins by IDs
 *
 * Uses `createApiRoute` + admins module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { validateBody } from '@/modules/shared/validation'
import { executeBatchGetAdmins } from '@/modules/admins'
import { z } from 'zod'

const batchGetSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required').max(100, 'Maximum 100 IDs allowed per batch request'),
})

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const input = await validateBody(batchGetSchema, request)

    const result = await executeBatchGetAdmins({
      input,
      user,
    })

    return { data: result }
  },
})
