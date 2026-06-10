/**
 * Courier Repository — Data access layer for the Courier module.
 *
 * Encapsulates all Prisma queries for courier-related operations, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 */

import { db } from '@/modules/shared/db'
import { Prisma, OrderStatus } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import type {
  CourierProfileDTO,
  CourierOrderDTO,
  CourierOrderCustomerDTO,
  NextOrderDTO,
  CourierStatsDTO,
  CompleteOrderResult,
  FailOrderResult,
  WithdrawResult,
  AdminCourierDTO,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Customer select for courier order list — only fields the courier needs. */
const CUSTOMER_SELECT = {
  name: true,
  phone: true,
  address: true,
  latitude: true,
  longitude: true,
} as const

/** Courier order select — full order details for the courier. */
const COURIER_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  customerId: true,
  deliveryAddress: true,
  deliveryTime: true,
  deliveryDate: true,
  latitude: true,
  longitude: true,
  quantity: true,
  calories: true,
  specialFeatures: true,
  notes: true,
  paymentStatus: true,
  paymentMethod: true,
  isPrepaid: true,
  courierId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: CUSTOMER_SELECT },
} as const

/** Admin profile select for courier profile. */
const COURIER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  salary: true,
  createdAt: true,
} as const

/** Admin courier select for admin management. */
const ADMIN_COURIER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  allowedTabs: true,
  salary: true,
  latitude: true,
  longitude: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type CourierOrderRow = Prisma.OrderGetPayload<{ select: typeof COURIER_ORDER_SELECT }>
type CourierProfileRow = Prisma.AdminGetPayload<{ select: typeof COURIER_PROFILE_SELECT }>
type AdminCourierRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_COURIER_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function toCustomerDTO(row: { name: string; phone: string; address?: string; latitude?: number | null; longitude?: number | null }): CourierOrderCustomerDTO {
  return {
    name: row.name,
    phone: row.phone,
    address: row.address,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  }
}

function toCourierOrderDTO(row: CourierOrderRow): CourierOrderDTO {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    orderStatus: row.orderStatus,
    customerId: row.customerId,
    deliveryAddress: row.deliveryAddress,
    deliveryTime: row.deliveryTime,
    deliveryDate: row.deliveryDate?.toISOString() ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    quantity: row.quantity,
    calories: row.calories,
    specialFeatures: row.specialFeatures,
    notes: row.notes,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    isPrepaid: row.isPrepaid,
    courierId: row.courierId,
    customer: toCustomerDTO(row.customer),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toNextOrderDTO(row: CourierOrderRow): NextOrderDTO {
  const base = toCourierOrderDTO(row)
  return {
    ...base,
    customerName: row.customer?.name || 'Unknown customer',
    customerPhone: row.customer?.phone || '',
    deliveryDate: row.deliveryDate
      ? new Date(row.deliveryDate).toISOString().split('T')[0]
      : new Date(row.createdAt).toISOString().split('T')[0],
    isAutoOrder: true,
  }
}

function toCourierProfileDTO(row: CourierProfileRow, salaryAccrued: number, salaryPaid: number): CourierProfileDTO {
  const salaryPerDay = Number(row.salary ?? 0)
  const balance = salaryAccrued - salaryPaid
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    salary: salaryPerDay,
    salaryPerDay,
    salaryAccrued,
    salaryPaid,
    balance,
    createdAt: row.createdAt.toISOString(),
  }
}

function toAdminCourierDTO(row: AdminCourierRow): AdminCourierDTO {
  const parsed = safeJsonParse<unknown>(row.allowedTabs, [])
  const allowedTabs = Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    allowedTabs,
    salary: Number(row.salary ?? 0),
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function diffDaysInclusiveUtc(from: Date, to: Date) {
  const fromDay = startOfDayUtc(from).getTime()
  const toDay = startOfDayUtc(to).getTime()
  const diff = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff + 1)
}

// ── Query operations ─────────────────────────────────────────────────────────

/**
 * Find a courier (Admin with role COURIER) by ID and return profile data.
 */
export async function findCourierProfile(courierId: string): Promise<CourierProfileDTO | null> {
  const admin = await db.admin.findUnique({
    where: { id: courierId },
    select: COURIER_PROFILE_SELECT,
  })

  if (!admin) return null

  const paidSalary = await db.transaction.aggregate({
    where: {
      category: 'SALARY',
      salaryRecipientAdminId: admin.id,
    },
    _sum: { amount: true },
  })

  const days = diffDaysInclusiveUtc(admin.createdAt, new Date())
  const accrued = Number(admin.salary ?? 0) * days
  const paid = Number(paidSalary._sum.amount ?? 0)

  return toCourierProfileDTO(admin, accrued, paid)
}

/**
 * List courier orders with date range filtering.
 */
export async function listCourierOrders(
  courierId: string,
  dateFilter: Record<string, unknown>,
): Promise<CourierOrderDTO[]> {
  const orders = await db.order.findMany({
    where: {
      courierId,
      deletedAt: null,
      orderStatus: { not: OrderStatus.PAUSED },
      customer: {
        isActive: true,
        autoOrdersEnabled: true,
      },
      ...dateFilter,
    },
    orderBy: { deliveryTime: 'asc' },
    select: COURIER_ORDER_SELECT,
  })

  return orders.map(toCourierOrderDTO)
}

/**
 * Find the next active order for a courier (PENDING or IN_DELIVERY, today).
 */
export async function findNextOrder(courierId: string): Promise<NextOrderDTO | null> {
  const order = await db.order.findFirst({
    where: {
      courierId,
      deletedAt: null,
      orderStatus: { in: [OrderStatus.PENDING, OrderStatus.IN_DELIVERY] },
      customer: {
        isActive: true,
        autoOrdersEnabled: true,
      },
      deliveryDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    orderBy: { deliveryTime: 'asc' },
    select: COURIER_ORDER_SELECT,
  })

  return order ? toNextOrderDTO(order) : null
}

/**
 * Get courier delivery stats.
 */
export async function getCourierStats(courierId: string): Promise<CourierStatsDTO> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalDelivered, todayDelivered] = await Promise.all([
    db.order.count({
      where: {
        courierId,
        orderStatus: 'DELIVERED',
      },
    }),
    db.order.count({
      where: {
        courierId,
        orderStatus: 'DELIVERED',
        deliveredAt: { gte: today },
      },
    }),
  ])

  return { totalDelivered, todayDelivered }
}

/**
 * Get courier route (today's non-failed orders).
 */
export async function getCourierRoute(courierId: string): Promise<CourierOrderDTO[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const orders = await db.order.findMany({
    where: {
      courierId,
      deliveryDate: { gte: today, lt: tomorrow },
      orderStatus: { not: OrderStatus.FAILED },
      deletedAt: null,
    },
    orderBy: { deliveryTime: 'asc' },
    select: COURIER_ORDER_SELECT,
  })

  return orders.map(toCourierOrderDTO)
}

/**
 * Find order by ID with courier ownership check.
 */
export async function findOrderForCourier(
  orderId: string,
  courierId: string,
): Promise<{ id: string; courierId: string | null; orderStatus: string } | null> {
  return db.order.findUnique({
    where: { id: orderId },
    select: { id: true, courierId: true, orderStatus: true },
  })
}

/**
 * Find courier with salary info for withdrawal.
 */
export async function findCourierForWithdraw(courierId: string): Promise<{
  id: string
  name: string
  salary: number
  createdAt: Date
  createdBy: string | null
} | null> {
  return db.admin.findUnique({
    where: { id: courierId },
    select: {
      id: true,
      name: true,
      salary: true,
      createdAt: true,
      createdBy: true,
    },
  })
}

/**
 * Calculate available balance for a courier.
 */
export async function calculateAvailableBalance(courierId: string, salaryPerDay: number, createdAt: Date): Promise<number> {
  const paidSalary = await db.transaction.aggregate({
    where: {
      category: 'SALARY',
      salaryRecipientAdminId: courierId,
    },
    _sum: { amount: true },
  })

  const days = diffDaysInclusiveUtc(createdAt, new Date())
  const accrued = salaryPerDay * days
  const paid = Number(paidSalary._sum.amount ?? 0)
  return accrued - paid
}

/**
 * Find payer admin (creator or self) for a courier withdrawal.
 */
export async function findPayerAdmin(payerId: string): Promise<{
  id: string
  companyBalance: number
} | null> {
  const admin = await db.admin.findUnique({
    where: { id: payerId },
    select: { id: true, companyBalance: true },
  })

  if (!admin) return null

  return {
    id: admin.id,
    companyBalance: Number(admin.companyBalance ?? 0),
  }
}

/**
 * Process a courier withdrawal transaction.
 */
export async function processWithdraw(
  courierId: string,
  courierName: string,
  payerId: string,
  amount: number,
): Promise<{ transactionId: string }> {
  const result = await db.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id: payerId },
      data: { companyBalance: { decrement: amount } },
    })

    const transaction = await tx.transaction.create({
      data: {
        amount,
        type: 'EXPENSE',
        category: 'SALARY',
        description: `Courier withdrawal: ${courierName}`,
        adminId: payerId,
        salaryRecipientAdminId: courierId,
      },
    })

    return transaction
  })

  return { transactionId: result.id }
}

/**
 * Update courier location (latitude + longitude).
 */
export async function updateCourierLocation(
  courierId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await db.admin.update({
    where: { id: courierId },
    data: { latitude, longitude },
  })
}

/**
 * Update courier profile fields (name and/or email).
 */
export async function updateCourierProfile(
  courierId: string,
  data: { name?: string; email?: string },
): Promise<void> {
  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email

  await db.admin.update({
    where: { id: courierId },
    data: updateData,
  })
}

/**
 * Update courier password.
 */
export async function updateCourierPassword(
  courierId: string,
  hashedPassword: string,
): Promise<void> {
  await db.admin.update({
    where: { id: courierId },
    data: { password: hashedPassword, hasPassword: true },
  })
}

/**
 * Find admin by ID with password (for password verification).
 */
export async function findAdminWithPassword(adminId: string): Promise<{
  id: string
  password: string | null
} | null> {
  return db.admin.findUnique({
    where: { id: adminId },
    select: { id: true, password: true },
  })
}

/**
 * Check if email is already taken by another admin.
 */
export async function isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
  const existing = await db.admin.findUnique({ where: { email } })
  return !!existing && existing.id !== excludeId
}

/**
 * Complete an order (mark as DELIVERED).
 */
export async function completeOrder(orderId: string): Promise<CompleteOrderResult> {
  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      orderStatus: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    },
    select: { id: true, orderStatus: true, deliveredAt: true },
  })

  return {
    id: updated.id,
    orderStatus: updated.orderStatus,
    deliveredAt: updated.deliveredAt?.toISOString() ?? null,
  }
}

/**
 * Fail an order (mark as FAILED).
 */
export async function failOrder(orderId: string): Promise<FailOrderResult> {
  const updated = await db.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.FAILED },
    select: { id: true, orderStatus: true },
  })

  return {
    id: updated.id,
    orderStatus: updated.orderStatus,
  }
}

/**
 * Create an audit event for order status changes.
 */
export async function logOrderEvent(
  orderId: string,
  actorAdminId: string,
  eventType: string,
  message: string,
  previousStatus?: string,
  nextStatus?: string,
): Promise<void> {
  await db.orderAuditEvent.create({
    data: {
      orderId,
      actorAdminId,
      eventType: 'STATUS_CHANGED' as any,
      actorRole: 'COURIER',
      previousStatus: previousStatus as any,
      nextStatus: nextStatus as any,
      message,
    },
  }).catch(() => {
    // Ignore audit logging failures
  })
}

/**
 * Log an action (for action_logs table).
 */
export async function logAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
): Promise<void> {
  await db.actionLog.create({
    data: { adminId, action, entityType, entityId, description },
  }).catch(() => {
    // Ignore logging failures
  })
}

// ── Admin courier management ────────────────────────────────────────────────

/**
 * List couriers for admin management, scoped by admin role.
 */
export async function listCouriersForAdmin(
  groupAdminIds: string[] | null,
): Promise<AdminCourierDTO[]> {
  const whereClause: Record<string, unknown> = {
    role: 'COURIER',
    isActive: true,
  }

  if (groupAdminIds) {
    whereClause.createdBy = { in: groupAdminIds }
  }

  const couriers = await db.admin.findMany({
    where: whereClause,
    select: ADMIN_COURIER_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return couriers.map(toAdminCourierDTO)
}

/**
 * Find a courier for admin update (with group scope check).
 */
export async function findCourierForAdminUpdate(
  courierId: string,
  groupAdminIds: string[] | null,
): Promise<AdminCourierRow | null> {
  const whereClause: Record<string, unknown> = {
    id: courierId,
    role: 'COURIER',
  }

  if (groupAdminIds) {
    whereClause.createdBy = { in: groupAdminIds }
  }

  return db.admin.findFirst({
    where: whereClause,
    select: ADMIN_COURIER_SELECT,
  })
}

/**
 * Update courier by admin.
 */
export async function adminUpdateCourier(
  courierId: string,
  data: { name?: string; latitude?: number | null; longitude?: number | null; salary?: number },
): Promise<AdminCourierDTO> {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.latitude !== undefined && data.longitude !== undefined) {
    updateData.latitude = data.latitude
    updateData.longitude = data.longitude
  }
  if (data.salary !== undefined) updateData.salary = data.salary

  const updated = await db.admin.update({
    where: { id: courierId },
    data: updateData,
    select: ADMIN_COURIER_SELECT,
  })

  return toAdminCourierDTO(updated)
}

/**
 * Create a new courier account.
 */
export async function createCourierAccount(data: {
  name: string
  email: string
  hashedPassword: string
  createdBy: string
  salary: number
}): Promise<AdminCourierDTO> {
  const newCourier = await db.admin.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.hashedPassword,
      role: 'COURIER',
      isActive: true,
      createdBy: data.createdBy,
      allowedTabs: null,
      salary: data.salary,
    },
    select: ADMIN_COURIER_SELECT,
  })

  return toAdminCourierDTO(newCourier)
}

/**
 * Check if a courier email already exists.
 */
export async function isCourierEmailTaken(email: string): Promise<boolean> {
  const existing = await db.admin.findUnique({ where: { email } })
  return !!existing
}

/**
 * Get courier with select for withdraw payer check.
 */
export async function findCourierCreatedBy(courierId: string): Promise<string | null> {
  const admin = await db.admin.findUnique({
    where: { id: courierId },
    select: { createdBy: true },
  })
  return admin?.createdBy ?? null
}
