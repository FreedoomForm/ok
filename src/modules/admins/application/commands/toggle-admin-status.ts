/**
 * Toggle admin active/inactive status.
 */
import { ForbiddenError, NotFoundError, BadRequestError } from '@/modules/shared/errors'
import { findAdminForOwnership, toggleAdminStatus, logAction } from '../../infrastructure'
import type { ToggleStatusResult } from '../../contracts'
import type { AuthUser } from '@/lib/auth-utils'

export type ToggleAdminStatusCommand = {
  user: AuthUser
  adminId: string
  isActive: boolean
}

export async function executeToggleAdminStatus({
  user,
  adminId,
  isActive,
}: ToggleAdminStatusCommand): Promise<ToggleStatusResult> {
  // Prevent self-modification
  if (user.id === adminId) {
    throw new BadRequestError('Cannot change your own account status')
  }

  // Check if admin exists
  const admin = await findAdminForOwnership(adminId)
  if (!admin) {
    throw new NotFoundError('Admin', adminId)
  }

  // Role-based permission checks
  if (user.role === 'MIDDLE_ADMIN') {
    // Middle admins can only manage LOW_ADMIN and COURIER
    if (admin.role !== 'LOW_ADMIN' && admin.role !== 'COURIER') {
      throw new ForbiddenError('Insufficient permissions to manage this admin')
    }
    // Middle admins can only manage admins they created
    if (admin.createdBy !== user.id) {
      throw new ForbiddenError('You can only manage admins you created')
    }
  } else if (user.role === 'SUPER_ADMIN') {
    // Super admins can only manage MIDDLE_ADMIN via the main toggle-status route
    if (admin.role !== 'MIDDLE_ADMIN') {
      throw new BadRequestError('Use the appropriate API for this admin type')
    }
  } else {
    throw new ForbiddenError('Insufficient permissions')
  }

  await toggleAdminStatus(adminId, isActive)

  // Log the action
  await logAction({
    adminId: user.id,
    action: 'TOGGLE_ADMIN_STATUS',
    entityType: 'ADMIN',
    entityId: adminId,
    oldValues: JSON.stringify({ isActive: admin.isActive }),
    newValues: JSON.stringify({ isActive }),
    description: `${isActive ? 'Activated' : 'Deactivated'} admin: ${admin.name}`,
  })

  return {
    id: adminId,
    isActive,
    name: admin.name,
    role: admin.role as ToggleStatusResult['role'],
  }
}
