/**
 * List Dishes Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { listDishes } from '../../infrastructure/warehouse.repository'
import type { DishDTO } from '../../contracts'

export interface ListDishesQuery {
  user: AuthUser
}

/**
 * Execute the List Dishes query.
 */
export async function executeListDishes(
  _query: ListDishesQuery,
): Promise<DishDTO[]> {
  return listDishes()
}
