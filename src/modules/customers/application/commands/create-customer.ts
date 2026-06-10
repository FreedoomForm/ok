/**
 * Create Customer Command — Application layer.
 *
 * Handles customer creation with:
 * - Phone validation
 * - Role-based createdBy scoping
 * - Duplicate phone detection (including soft-deleted)
 * - Field sanitization
 */

import { db } from '@/modules/shared/db'
import { getOwnerAdminId, getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { CustomerDetail, CreateCustomerData } from '../../contracts'
import {
  createCustomer,
  type CreateCustomerInput,
} from '../../infrastructure/customer.repository'
import { BadRequestError, ConflictError, ForbiddenError } from '@/modules/shared/errors'
import { Prisma } from '@prisma/client'
import { hashPassword } from '@/modules/sites/infrastructure/customer-auth'

const DEFAULT_DELIVERY_DAYS = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
}

export interface CreateCustomerCommand {
  user: AuthUser
  data: CreateCustomerData
}

export async function executeCreateCustomer(
  command: CreateCustomerCommand,
): Promise<CustomerDetail> {
  const { user, data } = command

  // ── Validate required fields ──
  if (!data.name || !data.phone || !data.address) {
    throw new BadRequestError('Не все обязательные поля заполнены')
  }

  if (data.phone.length < 10 || data.phone.length > 15) {
    throw new BadRequestError('Неверный формат номера телефона')
  }

  // ── Role-based scoping ──
  const groupAdminIds =
    user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN'
      ? await getGroupAdminIds(user)
      : null

  // Validate assignedSetId ownership
  if (data.assignedSetId && data.assignedSetId !== 'null' && data.assignedSetId !== '') {
    if (user.role !== 'SUPER_ADMIN') {
      const ownerAdminId = await getOwnerAdminId(user)
      if (!ownerAdminId) {
        throw new ForbiddenError('Недостаточно прав')
      }
      const set = await db.menuSet.findFirst({
        where: { id: data.assignedSetId, adminId: ownerAdminId },
        select: { id: true },
      })
      if (!set) {
        throw new BadRequestError('Указан неверный сет')
      }
    }
  }

  // Validate defaultCourierId
  if (data.defaultCourierId && data.defaultCourierId !== 'null' && data.defaultCourierId !== '') {
    if (user.role !== 'SUPER_ADMIN') {
      const couriers = await db.admin.findMany({
        where: {
          id: data.defaultCourierId,
          role: 'COURIER',
          ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}),
        },
        select: { id: true },
      })
      if (couriers.length === 0) {
        throw new BadRequestError('Указан неверный курьер')
      }
    }
  }

  // ── Sanitize fields ──
  const sanitizedCourierId =
    !data.defaultCourierId || data.defaultCourierId === '' || data.defaultCourierId === 'null'
      ? null
      : data.defaultCourierId

  const sanitizedAssignedSetId =
    !data.assignedSetId || data.assignedSetId === '' || data.assignedSetId === 'null'
      ? null
      : data.assignedSetId

  const deliveryDays = data.deliveryDays || DEFAULT_DELIVERY_DAYS

  // ── Hash password if provided ──
  let hashedPassword: string | undefined
  if (data.password) {
    hashedPassword = await hashPassword(data.password)
  }

  // ── Create customer ──
  const input: CreateCustomerInput = {
    name: data.name,
    nickName: data.nickName ?? null,
    phone: data.phone,
    address: data.address,
    preferences: data.specialFeatures || '',
    orderPattern: JSON.stringify(deliveryDays),
    deliveryDays: JSON.stringify(deliveryDays),
    calories: data.calories ? parseInt(String(data.calories)) || 2000 : 2000,
    planType: data.planType || 'CLASSIC',
    dailyPrice: data.dailyPrice ? parseInt(String(data.dailyPrice)) || 84000 : 84000,
    notes: data.notes || '',
    autoOrdersEnabled: data.autoOrdersEnabled !== undefined ? data.autoOrdersEnabled : true,
    isActive: true,
    latitude: parseNullableNumber(data.latitude),
    longitude: parseNullableNumber(data.longitude),
    defaultCourierId: sanitizedCourierId,
    assignedSetId: sanitizedAssignedSetId,
    createdBy: (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') ? user.id : null,
    password: hashedPassword,
  }

  try {
    return await createCustomer(input)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Check if the conflicting client is in the bin
        const deletedClient = await db.customer.findFirst({
          where: { phone: data.phone, deletedAt: { not: null } },
          select: { id: true },
        })

        if (deletedClient) {
          throw new ConflictError(
            'Клиент с таким номером находится в корзине. Восстановите его или удалите навсегда.',
          )
        }

        throw new ConflictError('Клиент с таким номером телефона уже существует')
      }
      if (error.code === 'P2003') {
        throw new BadRequestError('Указан неверный ID курьера или создателя')
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
