/**
 * Create a low admin (LOW_ADMIN, COURIER, WORKER).
 */
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ForbiddenError, BadRequestError, ConflictError } from '@/modules/shared/errors'
import { createLowAdmin, isEmailTaken, logAction } from '../../infrastructure'
import { emailSchema, passwordSchema } from '@/lib/validations'
import type { AdminDetail, CreateAdminData, AdminRoleString } from '../../contracts'
import type { AuthUser } from '@/lib/auth-utils'
import { safeJsonParse } from '@/lib/safe-json'

function parseAllowedTabs(raw: string | null): string[] | null {
  if (raw == null) return null
  const parsed = safeJsonParse<unknown>(raw, [])
  return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
}

const VALID_LOW_ROLES: AdminRoleString[] = ['LOW_ADMIN', 'COURIER', 'WORKER']

const VALID_TABS = [
  'orders', 'clients', 'admins', 'bin', 'statistics',
  'history', 'profile', 'warehouse', 'finance', 'interface',
  'chat', 'settings',
]

export type CreateAdminCommand = { user: AuthUser; data: CreateAdminData }

export async function executeCreateAdmin({ user, data }: CreateAdminCommand): Promise<AdminDetail> {
  // Permission check
  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only MIDDLE_ADMIN or SUPER_ADMIN can create admins')
  }

  // Validate required fields
  if (!data.email || !data.name || !data.role) {
    throw new BadRequestError('Email, name and role are required')
  }

  // Password is required for non-WORKER roles
  if (data.role !== 'WORKER' && !data.password) {
    throw new BadRequestError('Password is required for administrators and couriers')
  }

  // Validate role
  if (!VALID_LOW_ROLES.includes(data.role)) {
    throw new BadRequestError('Invalid role. Must be LOW_ADMIN, COURIER, or WORKER')
  }

  // Validate allowedTabs
  if (data.allowedTabs && !Array.isArray(data.allowedTabs)) {
    throw new BadRequestError('allowedTabs must be an array')
  }
  if (data.allowedTabs && data.allowedTabs.some((tab) => !VALID_TABS.includes(tab))) {
    throw new BadRequestError('Invalid value in allowedTabs')
  }

  // Validate email
  try {
    emailSchema.parse(data.email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
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

  // Check if admin already exists
  const emailTaken = await isEmailTaken(data.email)
  if (emailTaken) {
    throw new ConflictError('Admin with this email already exists')
  }

  // Hash password
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null

  const newAdmin = await createLowAdmin({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: data.role,
    allowedTabs: data.allowedTabs ?? null,
    salary: data.salary ?? 0,
    createdBy: user.id,
    hasPassword: !!data.password,
  })

  // Log the action
  await logAction({
    adminId: user.id,
    action: 'CREATE_ADMIN',
    entityType: 'ADMIN',
    entityId: newAdmin.id,
    description: `Created ${data.role.toLowerCase()}: ${data.name}`,
  })

  return {
    id: newAdmin.id,
    name: newAdmin.name,
    email: newAdmin.email,
    role: newAdmin.role as AdminRoleString,
    isActive: newAdmin.isActive,
    createdBy: newAdmin.createdBy,
    allowedTabs: parseAllowedTabs(newAdmin.allowedTabs),
    createdAt: newAdmin.createdAt.toISOString(),
    salary: newAdmin.salary,
    hasPassword: newAdmin.hasPassword,
  }
}
