/**
 * Update a middle admin (SUPER_ADMIN only).
 */
import { z } from 'zod'
import { ForbiddenError, BadRequestError, NotFoundError, ConflictError } from '@/modules/shared/errors'
import { findAdminForOwnership, updateMiddleAdmin, isEmailTaken, logAction } from '../../infrastructure'
import type { AdminListItem, UpdateMiddleAdminData } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

const updateMiddleAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'At least one field is required',
  })

export type UpdateMiddleAdminCommand = {
  user: AuthUser
  adminId: string
  data: UpdateMiddleAdminData
}

export async function executeUpdateMiddleAdmin({
  user,
  adminId,
  data,
}: UpdateMiddleAdminCommand): Promise<AdminListItem> {
  // Permission check — only SUPER_ADMIN can update middle admins
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only SUPER_ADMIN can update middle admins')
  }

  // Validate payload
  const parsed = updateMiddleAdminSchema.safeParse(data)
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid payload')
  }

  // Verify target admin exists and is a MIDDLE_ADMIN
  const targetAdmin = await findAdminForOwnership(adminId)
  if (!targetAdmin || targetAdmin.role !== 'MIDDLE_ADMIN') {
    throw new NotFoundError('Admin', adminId)
  }

  // Check email uniqueness if changing
  const nextEmail = parsed.data.email?.trim().toLowerCase()
  const nextName = parsed.data.name?.trim()

  if (nextEmail && nextEmail !== targetAdmin.email.toLowerCase()) {
    const taken = await isEmailTaken(nextEmail, adminId)
    if (taken) {
      throw new ConflictError('Admin with this email already exists')
    }
  }

  const updated = await updateMiddleAdmin(adminId, {
    ...(nextName !== undefined ? { name: nextName } : {}),
    ...(nextEmail !== undefined ? { email: nextEmail } : {}),
  })

  // Log action
  await logAction({
    adminId: user.id,
    action: 'UPDATE_ADMIN',
    entityType: 'ADMIN',
    entityId: adminId,
    description: `Updated middle admin: ${updated.name}`,
  })

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role as 'MIDDLE_ADMIN',
    isActive: updated.isActive,
    createdBy: targetAdmin.createdBy,
    allowedTabs: null,
    createdAt: updated.createdAt.toISOString(),
    salary: 0,
    creatorName: null,
  }
}
