/**
 * Update Ingredient Command — Application layer.
 *
 * Handles ingredient updates with validation.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { BadRequestError } from '@/modules/shared/errors'
import { updateIngredient } from '../../infrastructure/warehouse.repository'
import type { UpdateIngredientData, WarehouseItemDTO } from '../../contracts'

export interface UpdateIngredientCommand {
  user: AuthUser
  id: string
  data: Omit<UpdateIngredientData, 'id'>
}

/**
 * Execute the Update Ingredient command.
 */
export async function executeUpdateIngredient(
  command: UpdateIngredientCommand,
): Promise<WarehouseItemDTO> {
  const { id, data } = command

  if (!id) {
    throw new BadRequestError('ID is required')
  }

  return updateIngredient(id, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.unit !== undefined && { unit: data.unit }),
    ...(data.kcalPerGram !== undefined && { kcalPerGram: data.kcalPerGram }),
    ...(data.pricePerUnit !== undefined && { pricePerUnit: data.pricePerUnit }),
    ...(data.priceUnit !== undefined && { priceUnit: data.priceUnit }),
  })
}
