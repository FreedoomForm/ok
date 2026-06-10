/**
 * Reset another admin's password (generate a random one).
 */
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { ForbiddenError, NotFoundError, BadRequestError } from '@/modules/shared/errors'
import { findAdminForOwnership, updateAdminPassword, logAction } from '../../infrastructure'
import type { ResetPasswordResult } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type ResetPasswordCommand = { user: AuthUser; adminId: string }

export async function executeResetPassword({ user, adminId }: ResetPasswordCommand): Promise<ResetPasswordResult> {
  if (!['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  if (user.id === adminId) {
    throw new BadRequestError('Cannot reset your own password')
  }

  const targetAdmin = await findAdminForOwnership(adminId)
  if (!targetAdmin) {
    throw new NotFoundError('Admin', adminId)
  }

  // Middle admin can only reset passwords for admins they created
  if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
    throw new ForbiddenError('You can only reset passwords for admins you created')
  }

  const newPassword = randomBytes(9).toString('base64url')
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await updateAdminPassword(adminId, hashedPassword)

  // Log the action
  await logAction({
    adminId: user.id,
    action: 'RESET_ADMIN_PASSWORD',
    entityType: 'ADMIN',
    entityId: adminId,
    description: `Reset password for ${targetAdmin.name} (${targetAdmin.email})`,
  })

  return { password: newPassword }
}
