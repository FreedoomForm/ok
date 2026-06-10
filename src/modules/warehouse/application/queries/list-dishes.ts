/**
 * List Dishes Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { listDishes } from '../../infrastructure/warehouse.repository'
import type { DishDTO } from '../../contracts'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListDishesQuery {
  user: AuthUser
  cursor?: string
  limit?: number
}

/**
 * Execute the List Dishes query.
 */
export async function executeListDishes(
  query: ListDishesQuery,
): Promise<PaginatedResult<DishDTO>> {
  return listDishes(query.cursor, query.limit)
}
