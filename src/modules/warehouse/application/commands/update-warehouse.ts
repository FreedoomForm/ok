/**
 * Update Warehouse Command — Application layer.
 *
 * Handles updating the warehouse point (admin geolocation)
 * with support for direct coordinates or Google Maps link extraction.
 */

import { getOwnerAdminId } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import { hasRole } from '@/lib/auth-utils'
import { ForbiddenError, BadRequestError } from '@/modules/shared/errors'
import {
  updateWarehousePoint,
  extractCoordinatesFromInput,
  expandShortUrlIfNeeded,
} from '../../infrastructure/warehouse.repository'
import type { UpdateWarehouseData, WarehousePointUpdateResult } from '../../contracts'
import { z } from 'zod'

const patchSchema = z
  .object({
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    googleMapsLink: z.string().min(1).optional(),
  })
  .refine(
    (v) => (typeof v.lat === 'number' && typeof v.lng === 'number') || typeof v.googleMapsLink === 'string',
    { message: 'Provide either {lat,lng} or {googleMapsLink}' },
  )

export interface UpdateWarehouseCommand {
  user: AuthUser
  data: UpdateWarehouseData
}

/**
 * Execute the Update Warehouse command.
 */
export async function executeUpdateWarehouse(
  command: UpdateWarehouseCommand,
): Promise<WarehousePointUpdateResult> {
  const { user, data } = command

  if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    throw new ForbiddenError('Insufficient permissions')
  }

  const parsed = patchSchema.safeParse(data)
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id

  let lat: number | null = null
  let lng: number | null = null

  if (typeof parsed.data.lat === 'number' && typeof parsed.data.lng === 'number') {
    lat = parsed.data.lat
    lng = parsed.data.lng
  } else if (parsed.data.googleMapsLink) {
    const expanded = await expandShortUrlIfNeeded(parsed.data.googleMapsLink)
    const coords = extractCoordinatesFromInput(expanded) ?? extractCoordinatesFromInput(parsed.data.googleMapsLink)
    if (!coords || Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) {
      throw new BadRequestError('Could not extract coordinates from the link')
    }
    lat = coords.lat
    lng = coords.lng
  }

  if (lat == null || lng == null) {
    throw new BadRequestError('Could not determine coordinates')
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestError('Coordinates out of range')
  }

  await updateWarehousePoint(ownerAdminId, lat, lng)

  return { message: 'OK', lat, lng }
}
