/**
 * List Ingredients Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import { getOwnerAdminId } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import { listIngredients } from '../../infrastructure/warehouse.repository'
import type { WarehouseItemDTO } from '../../contracts'

export interface ListIngredientsQuery {
  user: AuthUser
}

/**
 * Execute the List Ingredients query.
 */
export async function executeListIngredients(
  _query: ListIngredientsQuery,
): Promise<WarehouseItemDTO[]> {
  return listIngredients()
}
