/**
 * Delete an admin.
 */
import { ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { findAdminForOwnership, deleteAdmin, logAction } from '../../infrastructure'
import type { DeleteAdminResult } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type DeleteAdminCommand = { user: AuthUser; adminId: string }

export async function executeDeleteAdmin({ user, adminId }: DeleteAdminCommand): Promise<DeleteAdminResult> {
  // Permission check
  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only MIDDLE_ADMIN or SUPER_ADMIN can delete admins')
  }

  // Verify target admin exists
  const targetAdmin = await findAdminForOwnership(adminId)
  if (!targetAdmin) {
    throw new NotFoundError('Admin', adminId)
  }

  // Middle admin can only delete admins they created
  if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
    throw new ForbiddenError('You can only delete admins you created')
  }

  await deleteAdmin(adminId)

  // Log action
  await logAction({
    adminId: user.id,
    action: 'DELETE_ADMIN',
    entityType: 'ADMIN',
    entityId: adminId,
    description: `Deleted admin ${targetAdmin.name}`,
  })

  return { success: true }
}
