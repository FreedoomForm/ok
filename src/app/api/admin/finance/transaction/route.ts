/**
 * Finance Transaction API Route — Migrated to createApiRoute pattern.
 *
 * GET  — List transactions (via executeListTransactions query)
 * POST — Create a transaction (via executeCreateTransaction command)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListTransactions, executeCreateTransaction } from '@/modules/finance'
import { z } from 'zod'

const TransactionSchema = z.object({
  customerId: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'company' | 'all' | 'client' | null
    const category = searchParams.get('category') ?? undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await executeListTransactions({
      user,
      filters: {
        type: type ?? 'all',
        category,
        limit,
      },
    })

    return { data: result }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const validation = TransactionSchema.safeParse(body)

    if (!validation.success) {
      const { BadRequestError } = await import('@/modules/shared/errors')
      throw new BadRequestError('Invalid request data', { details: validation.error.flatten() })
    }

    const result = await executeCreateTransaction({
      user,
      data: validation.data,
    })

    return { data: result }
  },
})
