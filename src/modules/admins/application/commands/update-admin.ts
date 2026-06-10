/**
 * Update a low admin (LOW_ADMIN, COURIER, WORKER).
 */
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ForbiddenError, BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { findAdminForOwnership, updateLowAdmin, logAction } from '../../infrastructure'
import { passwordSchema } from '@/lib/validations'
import type { AdminDetail, UpdateAdminData, AdminRoleString } from '../../contracts'
import type { AuthUser } from '@/lib/auth-utils'
import { safeJsonParse } from '@/lib/safe-json'

const VALID_TABS = [
  'orders', 'clients', 'admins', 'bin', 'statistics',
  'history', 'profile', 'warehouse', 'finance', 'interface',
  'chat', 'settings',
]

export type UpdateAdminCommand = { user: AuthUser; adminId: string; data: UpdateAdminData }

export async function executeUpdateAdmin({ user, adminId, data }: UpdateAdminCommand): Promise<AdminDetail> {
  // Permission check
  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only MIDDLE_ADMIN or SUPER_ADMIN can update admins')
  }

  // Validate allowedTabs
  if ('allowedTabs' in data) {
    if (data.allowedTabs != null && !Array.isArray(data.allowedTabs)) {
      throw new BadRequestError('Invalid allowedTabs')
    }
    if (Array.isArray(data.allowedTabs) && data.allowedTabs.some((tab) => !VALID_TABS.includes(tab))) {
      throw new BadRequestError('Invalid allowedTabs values')
    }
  }

  // Verify target admin exists
  const targetAdmin = await findAdminForOwnership(adminId)
  if (!targetAdmin) {
    throw new NotFoundError('Admin', adminId)
  }

  // Middle admin can only edit admins they created
  if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
    throw new ForbiddenError('You can only edit admins you created')
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

  // Hash password if provided
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined

  const updatedAdmin = await updateLowAdmin(adminId, {
    ...data,
    password: hashedPassword,
    hasPassword: hashedPassword ? true : undefined,
  })

  // Log action
  await logAction({
    adminId: user.id,
    action: 'UPDATE_ADMIN',
    entityType: 'ADMIN',
    entityId: adminId,
    description: `Updated admin ${updatedAdmin.name}`,
  })

  return {
    id: updatedAdmin.id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    role: updatedAdmin.role as AdminRoleString,
    isActive: updatedAdmin.isActive,
    createdBy: updatedAdmin.createdBy,
    allowedTabs: (() => {
      if (updatedAdmin.allowedTabs == null) return null
      const parsed = safeJsonParse<unknown>(updatedAdmin.allowedTabs, [])
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
    })(),
    createdAt: updatedAdmin.createdAt.toISOString(),
    salary: updatedAdmin.salary,
    hasPassword: updatedAdmin.hasPassword,
  }
}
