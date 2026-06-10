/**
 * Warehouse Dishes API Route — Migrated to createApiRoute pattern.
 *
 * GET    — List all dishes with menu associations
 * POST   — Create a new dish
 * PUT    — Update an existing dish
 * DELETE — Delete a dish
 */

import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import {
  executeListDishes,
  executeCreateDish,
} from '@/modules/warehouse'
import { updateDish, deleteDish } from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const result = await executeListDishes({ user })
    return { data: result }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeCreateDish({ user, data: body })
    return { data: result }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json()
    if (!body.id) {
      throw new BadRequestError('Missing ID')
    }
    const { id, ...data } = body
    const result = await updateDish(id, data)
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
    await deleteDish(id)
    return { data: { success: true } }
  },
})
