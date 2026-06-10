/**
 * Finance Buy Ingredients API Route — Migrated to createApiRoute pattern.
 *
 * POST — Buy ingredients (via executeBuyIngredients command)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeBuyIngredients } from '@/modules/finance'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()

    const result = await executeBuyIngredients({
      user,
      data: body,
    })

    return { data: result }
  },
})
