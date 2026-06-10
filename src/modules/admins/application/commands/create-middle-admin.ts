/**
 * Create a middle admin (SUPER_ADMIN only).
 */
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ForbiddenError, BadRequestError, ConflictError } from '@/modules/shared/errors'
import { createMiddleAdmin, isEmailTaken, logAction } from '../../infrastructure'
import { emailSchema, passwordSchema } from '@/modules/shared/validation/validations'
import type { AdminListItem, CreateMiddleAdminData } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type CreateMiddleAdminCommand = { user: AuthUser; data: CreateMiddleAdminData }

export async function executeCreateMiddleAdmin({
  user,
  data,
}: CreateMiddleAdminCommand): Promise<AdminListItem> {
  // Permission check — only SUPER_ADMIN can create middle admins
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only SUPER_ADMIN can create middle admins')
  }

  // Validate required fields
  if (!data.email || !data.password || !data.name) {
    throw new BadRequestError('All fields are required')
  }

  // Validate email
  try {
    emailSchema.parse(data.email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Validate password strength
  try {
    passwordSchema.parse(data.password)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Check if admin already exists
  const emailTaken = await isEmailTaken(data.email)
  if (emailTaken) {
    throw new ConflictError('Admin with this email already exists')
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12)

  const newAdmin = await createMiddleAdmin({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    createdBy: user.id,
  })

  // Log action
  await logAction({
    adminId: user.id,
    action: 'CREATE_ADMIN',
    entityType: 'ADMIN',
    entityId: newAdmin.id,
    description: `Created middle admin ${newAdmin.name} (${newAdmin.email})`,
  })

  return {
    id: newAdmin.id,
    name: newAdmin.name,
    email: newAdmin.email,
    role: newAdmin.role as 'MIDDLE_ADMIN',
    isActive: newAdmin.isActive,
    createdBy: user.id,
    allowedTabs: null,
    createdAt: newAdmin.createdAt.toISOString(),
    salary: 0,
    creatorName: null,
  }
}
