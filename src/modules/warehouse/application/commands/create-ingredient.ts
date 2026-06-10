/**
 * Create Ingredient Command — Application layer.
 *
 * Handles ingredient creation with validation and role-based scoping.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { BadRequestError } from '@/modules/shared/errors'
import { createIngredient } from '../../infrastructure/warehouse.repository'
import type { CreateIngredientData, WarehouseItemDTO } from '../../contracts'

export interface CreateIngredientCommand {
  user: AuthUser
  data: CreateIngredientData
}

/**
 * Execute the Create Ingredient command.
 */
export async function executeCreateIngredient(
  command: CreateIngredientCommand,
): Promise<WarehouseItemDTO> {
  const { data } = command

  if (!data.name) {
    throw new BadRequestError('Name is required')
  }

  return createIngredient({
    name: data.name,
    amount: data.amount || 0,
    unit: data.unit || 'gr',
    kcalPerGram: typeof data.kcalPerGram === 'number' ? data.kcalPerGram : null,
    pricePerUnit: typeof data.pricePerUnit === 'number' ? data.pricePerUnit : null,
    priceUnit: data.priceUnit || 'kg',
  })
}
