/**
 * Warehouse Inventory API Route — Migrated to createApiRoute pattern.
 *
 * GET  — Get inventory as a name→amount map
 * POST — Bulk save inventory (upsert by name)
 */

import { createApiRoute } from '@/modules/shared/http'
import { listIngredients, saveInventory } from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async () => {
    const result = await listIngredients()
    // Convert array to object map for frontend compatibility { [name]: amount }
    const inventoryMap: Record<string, number> = {}
    result.items.forEach((item) => {
      inventoryMap[item.name] = item.amount
    })
    return { data: inventoryMap }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json()
    const inventory: Record<string, number> = body
    const result = await saveInventory(inventory)
    return { data: result }
  },
})
