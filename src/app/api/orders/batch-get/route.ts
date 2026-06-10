/**
 * POST /api/orders/batch-get — Batch fetch orders by IDs
 *
 * Uses `createApiRoute` + orders module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { validateBody } from '@/modules/shared/validation'
import { executeBatchGetOrders } from '@/modules/orders'
import { z } from 'zod'

const batchGetSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required').max(100, 'Maximum 100 IDs allowed per batch request'),
})

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'],
  handler: async ({ request, user }) => {
    const input = await validateBody(batchGetSchema, request)

    const result = await executeBatchGetOrders({
      input,
      user,
    })

    return { data: result }
  },
})
