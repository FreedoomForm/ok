/**
 * Update Location Command — Application layer.
 *
 * Handles courier location updates with coordinate validation.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, ForbiddenError } from '@/modules/shared/errors'
import { updateCourierLocation } from '../../infrastructure/courier.repository'
import type { LocationUpdateData } from '../../contracts'

export interface UpdateLocationCommand {
  user: AuthUser
  data: LocationUpdateData
}

/**
 * Execute the Update Location command.
 */
export async function executeUpdateLocation(
  command: UpdateLocationCommand,
): Promise<{ success: boolean }> {
  const { user, data } = command

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new BadRequestError('Invalid coordinates')
  }

  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
    throw new BadRequestError('Invalid coordinates')
  }

  await updateCourierLocation(user.id, data.latitude, data.longitude)

  return { success: true }
}
