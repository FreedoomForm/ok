import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { MENUS } from '@/modules/warehouse/infrastructure/menu-data'
import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import { listMenuSets, createMenuSet } from '@/modules/admins'
import { Prisma } from '@prisma/client'

export const GET = createApiRoute({
  handler: async ({ user, request }) => {
    const { searchParams } = new URL(request.url)
    const requestedAdminId = searchParams.get('adminId')

    let ownerAdminId: string | null = null
    if (user.role === 'MIDDLE_ADMIN') {
      ownerAdminId = user.id
    } else if (user.role === 'LOW_ADMIN') {
      ownerAdminId = await getOwnerAdminId(user)
    } else if (user.role === 'SUPER_ADMIN') {
      ownerAdminId = requestedAdminId
    }

    const where: Prisma.MenuSetWhereInput = {}
    if (user.role !== 'SUPER_ADMIN') {
      if (!ownerAdminId) {
        throw new BadRequestError('Forbidden')
      }
      where.adminId = ownerAdminId
    } else if (ownerAdminId) {
      where.adminId = ownerAdminId
    }

    const sets = await listMenuSets(where)
    return { data: sets }
  },
})

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      throw new BadRequestError('Name is required')
    }

    // Initialize days with a single neutral group
    const initialCalorieGroups: Record<string, Prisma.InputJsonValue> = {}

    // Populate with Standard Menu data
    MENUS.forEach((menu) => {
      const menuDishes = (menu as unknown as Record<string, unknown>).dishes
      if (Array.isArray(menuDishes)) {
        const groupDishes = menuDishes.map((dish: Record<string, unknown>) => ({
          dishId: dish.id,
          dishName: dish.name,
          mealType: dish.mealType,
        }))

        if (groupDishes.length > 0) {
          initialCalorieGroups[String((menu as unknown as Record<string, unknown>).menuNumber)] = [
            {
              id: 'group-1',
              name: '1',
              calories: 0,
              dishes: groupDishes,
            },
          ] as unknown as Prisma.InputJsonValue
        }
      }
    })

    const newSet = await createMenuSet({
      name,
      description: description || '',
      menuNumber: 0,
      calorieGroups: initialCalorieGroups,
      isActive: false,
      admin: { connect: { id: user.id } },
    })

    return { data: newSet }
  },
})
