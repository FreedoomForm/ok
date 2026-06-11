/**
 * Menus API — GET (list / by number) + PUT (attach dish) + DELETE (detach dish)
 *
 * Thin route wired to the warehouse module. Previously used `db.menu` directly;
 * all data access now lives in the module's repository/use-cases.
 */

import { createApiRoute, type ApiResponse } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import {
  executeListMenus,
  executeGetMenu,
  executeAddDishToMenu,
  executeRemoveDishFromMenu,
} from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }): Promise<ApiResponse> => {
    const { searchParams } = new URL(request.url)
    const numberStr = searchParams.get('number')

    if (numberStr) {
      const number = parseInt(numberStr, 10)
      if (Number.isNaN(number)) {
        throw new BadRequestError('number must be an integer')
      }
      const menu = await executeGetMenu({ user, number })
      return { data: menu }
    }

    const menus = await executeListMenus({ user })
    return { data: menus }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    const { menuNumber, dishId } = await request.json()
    const menu = await executeAddDishToMenu({ user, menuNumber, dishId })
    return { data: menu }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    const { menuNumber, dishId } = await request.json()
    const menu = await executeRemoveDishFromMenu({ user, menuNumber, dishId })
    return { data: menu }
  },
})
