/**
 * Warehouse Cooking Plan API Route — Migrated to createApiRoute pattern.
 *
 * GET  — Get cooking plan for a date or date range
 * POST — Create/update a cooking plan
 */

import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { executeGetCookingPlan } from '@/modules/warehouse'
import { upsertCookingPlan } from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const result = await executeGetCookingPlan({
      user,
      date: dateStr ?? undefined,
      from: fromStr ?? undefined,
      to: toStr ?? undefined,
    })

    return { data: result }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json()
    const { date, menuNumber, dishes } = body

    if (!date || !menuNumber || !dishes) {
      throw new BadRequestError('Missing required fields')
    }

    const targetDate = new Date(date)
    const result = await upsertCookingPlan(targetDate, menuNumber, dishes)

    return { data: { success: true, plan: result } }
  },
})
