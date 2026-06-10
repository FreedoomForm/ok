/**
 * Get Next Order Query — Application layer.
 *
 * Resolves the next active order (PENDING or IN_DELIVERY) for a courier.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError } from '@/modules/shared/errors'
import { findNextOrder } from '../../infrastructure/courier.repository'
import type { NextOrderDTO } from '../../contracts'

export interface GetNextOrderQuery {
  user: AuthUser
}

/**
 * Execute the Get Next Order query.
 * Returns null if no active orders exist.
 */
export async function executeGetNextOrder(
  query: GetNextOrderQuery,
): Promise<NextOrderDTO | null> {
  const { user } = query

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  return findNextOrder(user.id)
}
