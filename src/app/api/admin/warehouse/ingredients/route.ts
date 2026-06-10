/**
 * Warehouse Ingredients API Route — Migrated to createApiRoute pattern.
 *
 * GET    — List all ingredients (warehouse items)
 * POST   — Create a new ingredient
 * PUT    — Update an existing ingredient
 * DELETE — Delete an ingredient
 */

import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import {
  executeListIngredients,
  executeCreateIngredient,
  executeUpdateIngredient,
} from '@/modules/warehouse'
import { deleteIngredient } from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListIngredients({ user, cursor, limit })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeCreateIngredient({ user, data: body })
    return { data: result }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    if (!body.id) {
      throw new BadRequestError('Missing ID')
    }
    const { id, ...data } = body
    const result = await executeUpdateIngredient({ user, id, data })
    return { data: result }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      throw new BadRequestError('Missing ID')
    }
    await deleteIngredient(id)
    return { data: { success: true } }
  },
})
