/**
 * Get Warehouse Point Query — Application layer.
 *
 * Returns the admin's warehouse geolocation point.
 */

import { getOwnerAdminId } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import { getWarehousePoint } from '../../infrastructure/warehouse.repository'
import type { WarehousePointDTO } from '../../contracts'

export interface GetWarehouseQuery {
  user: AuthUser
}

/**
 * Resolve the effective admin ID for warehouse operations.
 *
 * - LOW_ADMIN: uses owner admin ID (parent middle admin)
 * - MIDDLE_ADMIN / SUPER_ADMIN: uses own ID
 */
async function resolveEffectiveAdminId(user: AuthUser): Promise<string> {
  if (user.role === 'LOW_ADMIN') {
    const ownerAdminId = await getOwnerAdminId(user)
    return ownerAdminId ?? user.id
  }
  return user.id
}

/**
 * Execute the Get Warehouse Point query.
 */
export async function executeGetWarehouse(
  query: GetWarehouseQuery,
): Promise<WarehousePointDTO> {
  const effectiveAdminId = await resolveEffectiveAdminId(query.user)
  return getWarehousePoint(effectiveAdminId)
}
