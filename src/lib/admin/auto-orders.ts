import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from '@prisma/client'
import { z } from 'zod'

export const autoOrderCreateSchema = z.object({
  targetDate: z.coerce.date().optional(),
}).strict()

export type AutoOrderCreateData = z.infer<typeof autoOrderCreateSchema>

export const DELIVERY_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DeliveryDayKey = (typeof DELIVERY_DAY_KEYS)[number]
export type DeliveryDaySchedule = Record<DeliveryDayKey, boolean>

export type AutoOrderClientRecord = {
  id: string
  name: string
  phone: string
  address: string
  deliveryDays: Record<string, boolean>
  calories: number
  preferences: string | null
  latitude?: number | null
  longitude?: number | null
}

export type CreatedAutoOrderRecord = {
  id: string
  orderNumber: number
  customer: { id: string; name: string; phone: string }
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryTime: string | null
  deliveryDate: string
  quantity: number
  calories: number
  specialFeatures: string | null
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  isPrepaid: boolean
  orderStatus: OrderStatus
  isAutoOrder: true
  createdAt: Date
}

export const DEFAULT_DELIVERY_DAY_SCHEDULE: DeliveryDaySchedule = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
}

export function buildAutoOrderCustomerWhere(
  role: string,
  userId: string,
  lowAdminIds: string[],
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    isActive: true,
    deletedAt: null,
    autoOrdersEnabled: true,
  }

  if (role === 'MIDDLE_ADMIN') {
    where.createdBy = { in: [userId, ...lowAdminIds] }
  }

  return where
}

export function parseDeliveryDaySchedule(value: string | null | undefined): DeliveryDaySchedule {
  if (!value) return { ...DEFAULT_DELIVERY_DAY_SCHEDULE }

  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_DELIVERY_DAY_SCHEDULE }
    }

    return Object.fromEntries(
      DELIVERY_DAY_KEYS.map((key) => [key, (parsed as Record<string, unknown>)[key] === true]),
    ) as DeliveryDaySchedule
  } catch {
    return { ...DEFAULT_DELIVERY_DAY_SCHEDULE }
  }
}

export function isEligibleForDeliveryDay(schedule: DeliveryDaySchedule, date: Date): boolean {
  const day = DELIVERY_DAY_KEYS[date.getDay() === 0 ? 6 : date.getDay() - 1]
  return schedule[day]
}
