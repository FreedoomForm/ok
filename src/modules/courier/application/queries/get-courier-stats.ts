/**
 * Get Courier Stats Query — Application layer.
 *
 * Resolves delivery statistics for a courier.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError } from '@/modules/shared/errors'
import { getCourierStats } from '../../infrastructure/courier.repository'
import type { CourierStatsDTO } from '../../contracts'

export interface GetCourierStatsQuery {
  user: AuthUser
}

/**
 * Execute the Get Courier Stats query.
 */
export async function executeGetCourierStats(
  query: GetCourierStatsQuery,
): Promise<CourierStatsDTO> {
  const { user } = query

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  return getCourierStats(user.id)
}
