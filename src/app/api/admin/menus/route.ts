import { createApiRoute, type ApiResponse } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { db } from '@/lib/db'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request }): Promise<ApiResponse> => {
    const { searchParams } = new URL(request.url)
    const numberStr = searchParams.get('number')

    if (numberStr) {
      const menu = await db.menu.findUnique({
        where: { number: parseInt(numberStr) },
        include: { dishes: true },
      })

      return { data: menu }
    }

    const menus = await db.menu.findMany({
      select: { number: true, id: true, _count: { select: { dishes: true } } },
      orderBy: { number: 'asc' },
    })
    return { data: menus }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request }) => {
    const { menuNumber, dishId } = await request.json()
    if (!menuNumber || !dishId) {
      throw new BadRequestError('Missing required fields')
    }
    const menu = await db.menu.update({
      where: { number: menuNumber },
      data: {
        dishes: {
          connect: { id: dishId },
        },
      },
      include: { dishes: true },
    })
    return { data: menu }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request }) => {
    const { menuNumber, dishId } = await request.json()
    if (!menuNumber || !dishId) {
      throw new BadRequestError('Missing required fields')
    }
    const menu = await db.menu.update({
      where: { number: menuNumber },
      data: {
        dishes: {
          disconnect: { id: dishId },
        },
      },
      include: { dishes: true },
    })
    return { data: menu }
  },
})
