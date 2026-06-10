/**
 * Update own profile (self-edit by any authenticated admin).
 */
import bcrypt from 'bcryptjs'
import { BadRequestError, ConflictError } from '@/modules/shared/errors'
import { updateAdminProfile, isEmailTaken, logAction } from '../../infrastructure'
import { emailSchema, passwordSchema } from '@/modules/shared/validation/validations'
import { z } from 'zod'
import type { UpdateProfileData } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type UpdateProfileCommand = { user: AuthUser; data: UpdateProfileData }

export async function executeUpdateProfile({
  user,
  data,
}: UpdateProfileCommand): Promise<{
  id: string
  name: string
  email: string
  role: string
  message: string
}> {
  // Validate required fields
  if (!data.name || !data.email) {
    throw new BadRequestError('Name and Email are required')
  }

  // Validate email format
  try {
    emailSchema.parse(data.email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Check if email is taken by another admin
  const emailTaken = await isEmailTaken(data.email, user.id)
  if (emailTaken) {
    throw new ConflictError('Email is already in use')
  }

  // Validate password strength if provided
  if (data.password) {
    try {
      passwordSchema.parse(data.password)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(error.issues[0].message)
      }
    }
  }

  const hashedPassword = data.password ? await bcrypt.hash(data.password, 12) : undefined

  const updatedAdmin = await updateAdminProfile(user.id, {
    name: data.name,
    email: data.email,
    password: hashedPassword,
  })

  // Log action
  await logAction({
    adminId: user.id,
    action: 'UPDATE_PROFILE',
    entityType: 'ADMIN',
    entityId: user.id,
    description: `Updated profile for ${updatedAdmin.name}`,
  })

  return {
    id: updatedAdmin.id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    role: updatedAdmin.role,
    message: 'Profile successfully updated',
  }
}
