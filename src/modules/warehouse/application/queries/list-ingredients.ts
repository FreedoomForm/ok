/**
 * List Ingredients Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import { listIngredients } from '../../infrastructure/warehouse.repository'
import type { WarehouseItemDTO } from '../../contracts'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListIngredientsQuery {
  user: AuthUser
  cursor?: string
  limit?: number
}

/**
 * Execute the List Ingredients query.
 */
export async function executeListIngredients(
  query: ListIngredientsQuery,
): Promise<PaginatedResult<WarehouseItemDTO>> {
  return listIngredients(query.cursor, query.limit)
}
