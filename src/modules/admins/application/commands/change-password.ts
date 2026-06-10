/**
 * Change own password (with old password verification).
 */
import bcrypt from 'bcryptjs'
import { BadRequestError, UnauthorizedError, NotFoundError } from '@/modules/shared/errors'
import { findAdminWithPassword, updateAdminPassword, logAction } from '../../infrastructure'
import { passwordSchema } from '@/lib/validations'
import { z } from 'zod'
import type { ChangePasswordData } from '../../contracts'
import type { AuthUser } from '@/lib/auth-utils'

export type ChangePasswordCommand = { user: AuthUser; data: ChangePasswordData }

export async function executeChangePassword({ user, data }: ChangePasswordCommand): Promise<{ success: boolean }> {
  const { currentPassword, newPassword } = data

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current password and new password are required')
  }

  // Validate new password strength
  try {
    passwordSchema.parse(newPassword)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Get admin with password
  const admin = await findAdminWithPassword(user.id)
  if (!admin) {
    throw new NotFoundError('Admin', user.id)
  }

  // Check if admin has a password (not OAuth-only user)
  if (!admin.password) {
    throw new BadRequestError('Cannot change password for OAuth-only accounts')
  }

  // Verify current password
  const passwordMatch = await bcrypt.compare(currentPassword, admin.password)
  if (!passwordMatch) {
    throw new UnauthorizedError('Current password is incorrect')
  }

  // Hash and update
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await updateAdminPassword(user.id, hashedPassword)

  // Log the action
  await logAction({
    adminId: user.id,
    action: 'PASSWORD_CHANGED',
    entityType: 'ADMIN',
    entityId: user.id,
    description: `Password changed for ${admin.email}`,
  })

  return { success: true }
}
