/**
 * Create Menu Set Command — Application layer.
 *
 * Creates a new (inactive) menu set owned by the current admin, seeded from the
 * standard MENUS reference data. Encapsulates the seed-building that previously
 * lived in the API route.
 */

import { Prisma } from '@prisma/client'
import { BadRequestError } from '@/modules/shared/errors'
import { createMenuSet } from '../../infrastructure'
import { MENUS } from '@/modules/warehouse/infrastructure/menu-data'
import type { CreateMenuSetData, MenuSetDTO } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export interface CreateMenuSetCommand {
  user: AuthUser
  data: CreateMenuSetData
}

/** Build the initial calorie-group structure from the standard MENUS data. */
export function buildInitialCalorieGroups(): Record<string, Prisma.InputJsonValue> {
  const initial: Record<string, Prisma.InputJsonValue> = {}

  for (const menu of MENUS) {
    const record = menu as unknown as Record<string, unknown>
    const menuDishes = record.dishes
    if (!Array.isArray(menuDishes)) continue

    const groupDishes = menuDishes.map((dish: Record<string, unknown>) => ({
      dishId: dish.id,
      dishName: dish.name,
      mealType: dish.mealType,
    }))

    if (groupDishes.length > 0) {
      initial[String(record.menuNumber)] = [
        { id: 'group-1', name: '1', calories: 0, dishes: groupDishes },
      ] as unknown as Prisma.InputJsonValue
    }
  }

  return initial
}

export async function executeCreateMenuSet(
  command: CreateMenuSetCommand,
): Promise<MenuSetDTO> {
  const { user, data } = command

  if (!data.name) {
    throw new BadRequestError('Name is required')
  }

  const created = await createMenuSet({
    name: data.name,
    description: data.description || '',
    menuNumber: 0,
    calorieGroups: buildInitialCalorieGroups(),
    isActive: false,
    admin: { connect: { id: user.id } },
  })

  // `createMenuSet` returns the raw Prisma row; normalise to the DTO shape.
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    menuNumber: created.menuNumber,
    calorieGroups: created.calorieGroups,
    isActive: created.isActive,
    adminId: created.adminId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}
