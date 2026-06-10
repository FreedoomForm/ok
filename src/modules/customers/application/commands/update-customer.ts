/**
 * Update Customer Command — Application layer.
 *
 * Handles customer updates with:
 * - Role-based access control
 * - Field sanitization
 * - Duplicate phone detection
 * - Password hashing
 * - Payment status resolution
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds, getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { CustomerDetail, UpdateCustomerData } from '../../contracts'
import {
  updateCustomer,
} from '../../infrastructure/customer.repository'
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/modules/shared/errors'
import { Prisma } from '@prisma/client'
import { hashPassword } from '@/modules/sites/infrastructure/customer-auth'

export interface UpdateCustomerCommand {
  user: AuthUser
  customerId: string
  data: UpdateCustomerData
}

export async function executeUpdateCustomer(
  command: UpdateCustomerCommand,
): Promise<CustomerDetail> {
  const { user, customerId, data } = command

  // ── Role-based access check ──
  const scopedCreatedBy =
    user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  const existing = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, createdBy: true },
  })

  if (!existing) {
    throw new NotFoundError('Customer', customerId)
  }

  if (scopedCreatedBy && (!existing.createdBy || !scopedCreatedBy.includes(existing.createdBy))) {
    throw new NotFoundError('Customer', customerId)
  }

  // ── Validate assignedSetId ──
  if (data.assignedSetId !== undefined && data.assignedSetId !== null && data.assignedSetId !== '') {
    if (user.role !== 'SUPER_ADMIN') {
      const ownerAdminId = await getOwnerAdminId(user)
      if (!ownerAdminId) {
        throw new ForbiddenError('Недостаточно прав')
      }
      const set = await db.menuSet.findFirst({
        where: { id: data.assignedSetId as string, adminId: ownerAdminId },
        select: { id: true },
      })
      if (!set) {
        throw new BadRequestError('Указан неверный сет')
      }
    }
  }

  // ── Build update data ──
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.nickName !== undefined) updateData.nickName = data.nickName
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address
  if (data.specialFeatures !== undefined) updateData.preferences = data.specialFeatures
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.defaultCourierId !== undefined) updateData.defaultCourierId = data.defaultCourierId || null
  if (data.assignedSetId !== undefined) updateData.assignedSetId = data.assignedSetId || null
  if (data.calories !== undefined) updateData.calories = parseInt(String(data.calories)) || 2000
  if (data.autoOrdersEnabled !== undefined) updateData.autoOrdersEnabled = data.autoOrdersEnabled
  if (data.dailyPrice !== undefined) updateData.dailyPrice = parseInt(String(data.dailyPrice)) || 84000
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.planType !== undefined) updateData.planType = data.planType
  if (data.latitude !== undefined) {
    updateData.latitude = parseNullableNumber(data.latitude)
  }
  if (data.longitude !== undefined) {
    updateData.longitude = parseNullableNumber(data.longitude)
  }

  if (data.deliveryDays) {
    updateData.orderPattern = JSON.stringify(data.deliveryDays)
    updateData.deliveryDays = JSON.stringify(data.deliveryDays)
  }

  if (data.password) {
    updateData.password = await hashPassword(data.password)
  }

  try {
    return await updateCustomer(customerId, updateData)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictError('Клиент с таким номером телефона уже существует')
      }
      if (error.code === 'P2025') {
        throw new NotFoundError('Customer', customerId)
      }
    }
    throw error
  }
}

function parseNullableNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === '' || v === 'null') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
