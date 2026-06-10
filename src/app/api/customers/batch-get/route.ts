/**
 * POST /api/customers/batch-get — Batch fetch customers by IDs
 *
 * Uses `createApiRoute` + customers module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { validateBody } from '@/modules/shared/validation'
import { executeBatchGetCustomers } from '@/modules/customers'
import { z } from 'zod'

const batchGetSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required').max(100, 'Maximum 100 IDs allowed per batch request'),
})

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const input = await validateBody(batchGetSchema, request)

    const result = await executeBatchGetCustomers({
      input,
      user,
    })

    return { data: result }
  },
})
