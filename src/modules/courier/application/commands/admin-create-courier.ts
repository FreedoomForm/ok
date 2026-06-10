/**
 * Admin Create Courier Command — Application layer.
 *
 * Handles creating new courier accounts by admins.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, ConflictError, ForbiddenError } from '@/modules/shared/errors'
import { getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import { createCourierAccount, isCourierEmailTaken, logAction } from '../../infrastructure/courier.repository'
import { passwordSchema, emailSchema } from '@/modules/shared/validation/validations'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import type { AdminCourierCreateData, AdminCourierDTO } from '../../contracts'
import { invalidateCache } from '@/modules/shared/cache'

export interface AdminCreateCourierCommand {
  user: AuthUser
  data: AdminCourierCreateData
}

/**
 * Execute the Admin Create Courier command.
 */
export async function executeAdminCreateCourier(
  command: AdminCreateCourierCommand,
): Promise<AdminCourierDTO> {
  const { user, data } = command

  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Access denied')
  }

  if (!data.name || !data.email || !data.password) {
    throw new BadRequestError('All fields are required')
  }

  // Validate email
  try {
    emailSchema.parse(data.email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0]?.message || 'Invalid email')
    }
  }

  // Validate password
  try {
    passwordSchema.parse(data.password)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0]?.message || 'Invalid password')
    }
  }

  // Check if email already exists
  const emailTaken = await isCourierEmailTaken(data.email)
  if (emailTaken) {
    throw new ConflictError('A courier with this email already exists')
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10)

  const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id
  const createdByAdminId = user.role === 'SUPER_ADMIN' ? user.id : ownerAdminId

  // Create courier
  const newCourier = await createCourierAccount({
    name: data.name,
    email: data.email,
    hashedPassword,
    createdBy: createdByAdminId,
    salary: data.salary ? parseInt(String(data.salary)) : 0,
  })

  // Log the action
  await logAction(user.id, 'CREATE_COURIER', 'ADMIN', newCourier.id, `Created courier account: ${newCourier.name} (${newCourier.email})`)

  // Invalidate cache
  invalidateCache('couriers:')
  invalidateCache('dashboard:')

  return newCourier
}
