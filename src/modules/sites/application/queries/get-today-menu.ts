/**
 * Get Today Menu Query — Application layer.
 *
 * Returns the available dishes for today based on the customer's
 * assigned menu set or the default menu rotation.
 */

import { UnauthorizedError, NotFoundError } from '@/modules/shared/errors'
import { findTodayMenu } from '../../infrastructure/sites.repository'
import type { TodayMenuDTO } from '../../contracts'

export interface GetTodayMenuQuery {
  customerId: string
}

/**
 * Execute the Get Today Menu query.
 */
export async function executeGetTodayMenu(
  query: GetTodayMenuQuery,
): Promise<TodayMenuDTO> {
  if (!query.customerId) {
    throw new UnauthorizedError()
  }

  const menu = await findTodayMenu(query.customerId)
  if (!menu) {
    throw new NotFoundError('Menu')
  }
  return menu
}
