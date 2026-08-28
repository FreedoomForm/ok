import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { MENUS } from '@/lib/menuData'

export const setCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).optional().default(''),
}).strip()

export type SetCreateData = z.infer<typeof setCreateSchema>

function isSafeJsonValue(value: unknown, depth = 0): value is Prisma.InputJsonValue {
  if (depth > 8) return false
  if (typeof value === 'string') return value.length <= 1_000_000
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length <= 5_000 && value.every((item) => isSafeJsonValue(item, depth + 1))
  if (typeof value !== 'object' || value === null) return false
  const entries = Object.entries(value)
  return entries.length <= 1_000 && entries.every(([key, item]) => key.length <= 200 && isSafeJsonValue(item, depth + 1))
}

const calorieGroupsSchema = z.custom<Prisma.InputJsonValue>(isSafeJsonValue, 'Invalid calorie group data')

export const setUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  calorieGroups: calorieGroupsSchema.optional(),
  isActive: z.boolean().optional(),
  deletedAt: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'At least one set field is required')

export type SetUpdateData = z.infer<typeof setUpdateSchema>

export function buildMenuSetWhere(adminId: string | null, showDeleted = false): Prisma.MenuSetWhereInput {
  return {
    ...(adminId ? { adminId } : {}),
    deletedAt: showDeleted ? { not: null } : null,
  }
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
