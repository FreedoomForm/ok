/**
 * Create Dish Command — Application layer.
 *
 * Handles dish creation with validation and menu association.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError } from '@/modules/shared/errors'
import { createDish } from '../../infrastructure/warehouse.repository'
import type { CreateDishData, DishDTO } from '../../contracts'

export interface CreateDishCommand {
  user: AuthUser
  data: CreateDishData
}

/**
 * Execute the Create Dish command.
 */
export async function executeCreateDish(
  command: CreateDishCommand,
): Promise<DishDTO> {
  const { data } = command

  if (!data.name || !data.mealType) {
    throw new BadRequestError('Name and mealType are required')
  }

  return createDish({
    name: data.name,
    description: data.description,
    mealType: data.mealType,
    ingredients: data.ingredients || [],
    calorieMappings: data.calorieMappings,
    menuNumbers: data.menuNumbers,
  })
}
