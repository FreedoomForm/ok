/**
 * Get Courier Route Query — Application layer.
 *
 * Resolves today's route for a courier (non-failed orders).
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError } from '@/modules/shared/errors'
import { getCourierRoute } from '../../infrastructure/courier.repository'
import type { CourierRouteDTO } from '../../contracts'

export interface GetCourierRouteQuery {
  user: AuthUser
  orderId?: string
}

/**
 * Execute the Get Courier Route query.
 */
export async function executeGetCourierRoute(
  query: GetCourierRouteQuery,
): Promise<CourierRouteDTO> {
  const { user } = query

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  return getCourierRoute(user.id)
}
