/**
 * Create Order Command — Application layer.
 *
 * Handles order creation with:
 * - Customer resolution (existing or auto-create)
 * - Role-based data scoping
 * - Order number generation (retry on unique constraint violation)
 * - Payment status resolution
 * - Finance transaction recording
 * - Audit event logging
 */

import { db } from '@/modules/shared/db'
import { getOwnerAdminId, getGroupAdminIds } from '@/lib/admin-scope'
import { appendOrderAudit, getCourierAssignmentPatch } from '@/lib/order-audit'
import type { AuthUser } from '@/lib/auth-utils'
import type { OrderDetail } from '../../contracts'
import {
  createOrder,
  type CreateOrderInput,
} from '../../infrastructure/order.repository'
import { Prisma, PaymentStatus, PaymentMethod, OrderStatus, OrderEventType } from '@prisma/client'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, InternalError } from '@/modules/shared/errors'

// ── Input types ─────────────────────────────────────────────────────────────

export interface CreateOrderData {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryTime?: string
  quantity?: number | string
  calories: number | string
  specialFeatures?: string
  paymentStatus?: string
  paymentMethod?: string
  isPrepaid?: boolean
  amountReceived?: number | string
  date?: string
  selectedClientId?: string
  courierId?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  priority?: number | string
  sourceChannel?: string
  etaMinutes?: number | string | null
  routeDistanceKm?: number | string | null
  routeDurationMin?: number | string | null
  sequenceInRoute?: number | string | null
  assignedSetId?: string | null
}

export interface CreateOrderCommand {
  user: AuthUser
  data: CreateOrderData
}

// ── Command handler ─────────────────────────────────────────────────────────

export async function executeCreateOrder(
  command: CreateOrderCommand,
): Promise<OrderDetail> {
  const { user, data } = command

  // ── Validate required fields ──
  if (!data.customerName || !data.customerPhone || !data.deliveryAddress || !data.calories) {
    throw new BadRequestError('Не все обязательные поля заполнены')
  }

  if (data.customerPhone.length < 10 || data.customerPhone.length > 15) {
    throw new BadRequestError('Неверный формат номера телефона')
  }

  const parsedCalories = parseInt(String(data.calories))
  if (isNaN(parsedCalories)) {
    throw new BadRequestError('Калории должны быть числом')
  }

  const parsedQuantity = data.quantity ? parseInt(String(data.quantity)) : 1
  if (isNaN(parsedQuantity)) {
    throw new BadRequestError('Количество должно быть числом')
  }

  const parsedPriority =
    data.priority !== undefined && data.priority !== null && data.priority !== ''
      ? Math.min(5, Math.max(1, Number(data.priority)))
      : 3

  if (data.date && isNaN(Date.parse(data.date))) {
    throw new BadRequestError('Неверный формат даты')
  }

  // Validate enums
  if (data.paymentStatus && !['PAID', 'UNPAID', 'PARTIAL'].includes(String(data.paymentStatus))) {
    throw new BadRequestError('Неверный статус оплаты')
  }
  if (data.paymentMethod && !['CASH', 'CARD', 'TRANSFER'].includes(String(data.paymentMethod))) {
    throw new BadRequestError('Неверный способ оплаты')
  }

  // ── Sanitize fields ──
  const sanitizedCourierId = (data.courierId === '' || data.courierId === 'null') ? null : data.courierId

  let sanitizedLatitude: number | null = null
  if (data.latitude !== undefined && data.latitude !== null && data.latitude !== '') {
    const lat = parseFloat(String(data.latitude))
    if (!isNaN(lat) && lat >= -90 && lat <= 90) sanitizedLatitude = lat
  }

  let sanitizedLongitude: number | null = null
  if (data.longitude !== undefined && data.longitude !== null && data.longitude !== '') {
    const lng = parseFloat(String(data.longitude))
    if (!isNaN(lng) && lng >= -180 && lng <= 180) sanitizedLongitude = lng
  }

  const sanitizedAssignedSetId =
    data.assignedSetId === '' || data.assignedSetId === 'null' || data.assignedSetId === undefined
      ? null
      : String(data.assignedSetId)

  const hasAssignedSetId = Object.prototype.hasOwnProperty.call(data, 'assignedSetId')

  // ── Role-based scoping ──
  const ownerAdminId = await getOwnerAdminId(user)
  const financeAdminId = ownerAdminId ?? user.id
  const groupAdminIds =
    user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN'
      ? await getGroupAdminIds(user)
      : null

  // Validate assignedSetId ownership
  if (hasAssignedSetId && sanitizedAssignedSetId && user.role !== 'SUPER_ADMIN') {
    if (!ownerAdminId) {
      throw new ForbiddenError('Недостаточно прав')
    }
    const set = await db.menuSet.findFirst({
      where: { id: sanitizedAssignedSetId, adminId: ownerAdminId },
      select: { id: true },
    })
    if (!set) {
      throw new BadRequestError('Указан неверный сет')
    }
  }

  const allowedCustomerCreatorIds = groupAdminIds

  // ── Resolve or create customer ──
  let customer: { id: string; defaultCourierId: string | null; dailyPrice: number; assignedSetId: string | null } | null = null

  if (data.selectedClientId && data.selectedClientId !== 'manual') {
    customer = await db.customer.findFirst({
      where: {
        id: data.selectedClientId,
        deletedAt: null,
        ...(allowedCustomerCreatorIds ? { createdBy: { in: allowedCustomerCreatorIds } } : {}),
      },
      select: { id: true, defaultCourierId: true, dailyPrice: true, assignedSetId: true },
    })
    if (!customer) {
      throw new NotFoundError('Клиент', data.selectedClientId)
    }
  } else {
    customer = await db.customer.findFirst({
      where: {
        phone: data.customerPhone,
        deletedAt: null,
        ...(allowedCustomerCreatorIds ? { createdBy: { in: allowedCustomerCreatorIds } } : {}),
      },
      select: { id: true, defaultCourierId: true, dailyPrice: true, assignedSetId: true },
    })
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone,
          address: data.deliveryAddress,
          preferences: data.specialFeatures,
          orderPattern: 'manual',
          isActive: false,
          latitude: sanitizedLatitude,
          longitude: sanitizedLongitude,
          assignedSetId: hasAssignedSetId ? sanitizedAssignedSetId : null,
          createdBy: (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') ? user.id : null,
        },
        select: { id: true, defaultCourierId: true, dailyPrice: true, assignedSetId: true },
      })
    }
  }

  if (hasAssignedSetId) {
    customer = await db.customer.update({
      where: { id: customer.id },
      data: { assignedSetId: sanitizedAssignedSetId },
      select: { id: true, defaultCourierId: true, dailyPrice: true, assignedSetId: true },
    })
  }

  // ── Resolve payment status ──
  const parsedAmountReceivedRaw =
    data.amountReceived !== undefined && data.amountReceived !== null && String(data.amountReceived).trim() !== ''
      ? Number(data.amountReceived)
      : 0
  const parsedAmountReceived = Number.isFinite(parsedAmountReceivedRaw) ? parsedAmountReceivedRaw : 0
  const normalizedAmountReceived = parsedAmountReceived > 0 ? parsedAmountReceived : 0

  const customerDailyPrice = customer.dailyPrice || 84000
  const totalOrderCost = customerDailyPrice * parsedQuantity

  const resolvedPaymentStatus: PaymentStatus =
    data.paymentStatus
      ? (String(data.paymentStatus) as PaymentStatus)
      : normalizedAmountReceived >= totalOrderCost
        ? PaymentStatus.PAID
        : normalizedAmountReceived > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.UNPAID

  const resolvedCourierId = sanitizedCourierId || customer.defaultCourierId || null

  const parseNullableNumber = (v: unknown): number | null => {
    if (v === undefined || v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // ── Create order with retry on orderNumber collision ──
  const input: CreateOrderInput = {
    customerId: customer.id,
    adminId: user.id,
    courierId: resolvedCourierId,
    deliveryAddress: data.deliveryAddress,
    deliveryDate: data.date ? new Date(data.date) : null,
    deliveryTime: data.deliveryTime || '12:00',
    quantity: parsedQuantity,
    calories: parsedCalories,
    specialFeatures: data.specialFeatures || '',
    paymentStatus: resolvedPaymentStatus,
    paymentMethod: (data.paymentMethod ? String(data.paymentMethod) : PaymentMethod.CASH) as PaymentMethod,
    isPrepaid: data.isPrepaid || false,
    amountReceived: normalizedAmountReceived > 0 ? normalizedAmountReceived : null,
    orderStatus: OrderStatus.NEW,
    sourceChannel: data.sourceChannel ? String(data.sourceChannel) : 'ADMIN_PANEL',
    priority: parsedPriority,
    etaMinutes: parseNullableNumber(data.etaMinutes),
    routeDistanceKm: parseNullableNumber(data.routeDistanceKm),
    routeDurationMin: parseNullableNumber(data.routeDurationMin),
    sequenceInRoute: parseNullableNumber(data.sequenceInRoute),
    latitude: sanitizedLatitude,
    longitude: sanitizedLongitude,
  }

  let newOrder: OrderDetail | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      newOrder = await createOrder(input)
      break
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestError('Указан неверный ID курьера или клиента')
      }
      throw error
    }
  }

  if (!newOrder) {
    throw new InternalError('Не удалось сгенерировать номер заказа')
  }

  // ── Audit: Order created ──
  await appendOrderAudit(db, {
    orderId: newOrder.id,
    eventType: OrderEventType.CREATED,
    actorAdminId: user.id,
    actorRole: user.role,
    actorName: (user as any).name || null,
    nextStatus: newOrder.orderStatus as any,
    payload: {
      sourceChannel: input.sourceChannel,
      priority: parsedPriority,
    },
    message: 'Order created',
  })

  // ── Record payment if amount received ──
  if (normalizedAmountReceived > 0) {
    try {
      await db.$transaction([
        db.transaction.create({
          data: {
            amount: normalizedAmountReceived,
            type: 'INCOME',
            category: 'ORDER_PAYMENT',
            description: `Order payment (Order #${newOrder.orderNumber})`,
            adminId: financeAdminId,
            customerId: customer.id,
          },
        }),
        db.customer.update({
          where: { id: customer.id },
          data: { balance: { increment: normalizedAmountReceived } },
        }),
        db.admin.update({
          where: { id: financeAdminId },
          data: { companyBalance: { increment: normalizedAmountReceived } },
        }),
      ])
    } catch (error) {
      console.error('Error recording order payment on create:', error)
      try {
        await db.order.update({
          where: { id: newOrder.id },
          data: { amountReceived: null, paymentStatus: PaymentStatus.UNPAID },
        })
      } catch { /* ignore rollback failures */ }
      throw new InternalError('Failed to record payment')
    }
  }

  // ── Audit: Courier assigned ──
  if (resolvedCourierId) {
    await appendOrderAudit(db, {
      orderId: newOrder.id,
      eventType: OrderEventType.COURIER_ASSIGNED,
      actorAdminId: user.id,
      actorRole: user.role,
      actorName: (user as any).name || null,
      nextStatus: newOrder.orderStatus as any,
      payload: { courierId: resolvedCourierId },
      message: 'Courier assigned on create',
    })
  }

  return newOrder
}
