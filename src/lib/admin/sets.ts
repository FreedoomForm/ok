import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { MENUS } from '@/lib/menuData'

export const setCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).optional().default(''),
}).strip()

export type SetCreateData = z.infer<typeof setCreateSchema>

export function buildMenuSetWhere(adminId: string | null): Prisma.MenuSetWhereInput {
  return adminId ? { adminId } : {}
}

export type InitialCalorieGroup = {
  id: string
  name: string
  calories: number
  dishes: Array<{
    dishId: number
    dishName: string
    mealType: string
  }>
}

export type InitialCalorieGroups = Record<string, InitialCalorieGroup[]>

export function buildInitialCalorieGroups(): InitialCalorieGroups {
  const groups: InitialCalorieGroups = {}

  for (const menu of MENUS) {
    const groupDishes = menu.dishes.map((dish) => ({
      dishId: dish.id,
      dishName: dish.name,
      mealType: dish.mealType,
    }))

    if (groupDishes.length > 0) {
      groups[String(menu.menuNumber)] = [{
        id: 'group-1',
        name: '1',
        calories: 0,
        dishes: groupDishes,
      }]
    }
  }

  return groups
}
