/**
 * Update Profile Command — Application layer.
 *
 * Handles courier profile updates (name, email) and password changes.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { BadRequestError, ConflictError, ForbiddenError } from '@/modules/shared/errors'
import { updateCourierProfile, updateCourierPassword, findAdminWithPassword, isEmailTaken, logAction } from '../../infrastructure/courier.repository'
import bcrypt from 'bcryptjs'
import { passwordSchema } from '@/lib/validations'
import { z } from 'zod'
import type { ProfileUpdateData } from '../../contracts'

export interface UpdateProfileCommand {
  user: AuthUser
  data: ProfileUpdateData
}

/**
 * Execute the Update Profile command.
 */
export async function executeUpdateProfile(
  command: UpdateProfileCommand,
): Promise<{ message: string }> {
  const { user, data } = command

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Access denied')
  }

  // Handle profile update (name, email)
  if (data.name || data.email) {
    if (data.email) {
      const emailTaken = await isEmailTaken(data.email, user.id)
      if (emailTaken) {
        throw new ConflictError('Email already in use')
      }
    }

    await updateCourierProfile(user.id, {
      name: data.name,
      email: data.email,
    })

    await logAction(user.id, 'UPDATE_PROFILE', 'ADMIN', user.id, 'Courier updated their profile')

    return { message: 'Profile updated successfully' }
  }

  // Handle password change
  if (data.currentPassword && data.newPassword) {
    // Validate new password
    try {
      passwordSchema.parse(data.newPassword)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(error.issues[0]?.message || 'Invalid password')
      }
    }

    // Get current admin data to check password
    const admin = await findAdminWithPassword(user.id)
    if (!admin || !admin.password) {
      throw new BadRequestError('User not found')
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, admin.password)
    if (!isValid) {
      throw new BadRequestError('Incorrect current password')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10)
    await updateCourierPassword(user.id, hashedPassword)

    await logAction(user.id, 'CHANGE_PASSWORD', 'ADMIN', user.id, 'Courier changed their own password')

    return { message: 'Password changed successfully' }
  }

  throw new BadRequestError('Invalid data')
}
