/**
 * Admin Update Courier Command — Application layer.
 *
 * Handles admin updates to courier accounts (name, location, salary).
 */

import type { AuthUser } from '@/lib/auth-utils'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { findCourierForAdminUpdate, adminUpdateCourier, logAction } from '../../infrastructure/courier.repository'
import type { AdminCourierPatchData, AdminCourierDTO } from '../../contracts'

export interface AdminUpdateCourierCommand {
  user: AuthUser
  data: AdminCourierPatchData
}

/**
 * Execute the Admin Update Courier command.
 */
export async function executeAdminUpdateCourier(
  command: AdminUpdateCourierCommand,
): Promise<AdminCourierDTO> {
  const { user, data } = command

  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  // Validate that at least one update field is provided
  if (
    data.name === undefined &&
    data.latitude === undefined &&
    data.longitude === undefined &&
    data.salary === undefined
  ) {
    throw new BadRequestError('No update fields provided')
  }

  // Validate that lat/lng are provided together
  if (
    (data.latitude === undefined && data.longitude !== undefined) ||
    (data.latitude !== undefined && data.longitude === undefined)
  ) {
    throw new BadRequestError('Provide both latitude and longitude together')
  }

  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  const existingCourier = await findCourierForAdminUpdate(data.courierId, groupAdminIds)
  if (!existingCourier) {
    throw new NotFoundError('Courier', data.courierId)
  }

  const updatedCourier = await adminUpdateCourier(existingCourier.id, {
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    salary: data.salary,
  })

  await logAction(user.id, 'UPDATE_COURIER', 'ADMIN', updatedCourier.id, `Updated courier from map: ${updatedCourier.name}`)

  return updatedCourier
}
