/**
 * Get Courier Profile Query — Application layer.
 *
 * Resolves the courier profile including salary calculations.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { NotFoundError, ForbiddenError } from '@/modules/shared/errors'
import { findCourierProfile } from '../../infrastructure/courier.repository'
import type { CourierProfileDTO } from '../../contracts'

export interface GetCourierProfileQuery {
  user: AuthUser
}

/**
 * Execute the Get Courier Profile query.
 */
export async function executeGetCourierProfile(
  query: GetCourierProfileQuery,
): Promise<CourierProfileDTO> {
  const { user } = query

  if (user.role !== 'COURIER' && !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Access denied')
  }

  const profile = await findCourierProfile(user.id)
  if (!profile) {
    throw new NotFoundError('User')
  }

  return profile
}
