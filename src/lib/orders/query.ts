import { Prisma, type AdminRole, PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client'

export type OrderFilterInput = {
  successful?: boolean
  failed?: boolean
  pending?: boolean
  inDelivery?: boolean
  paid?: boolean
  unpaid?: boolean
  card?: boolean
  cash?: boolean
  calories1200?: boolean
  calories1600?: boolean
  calories2000?: boolean
  calories2500?: boolean
  calories3000?: boolean
  autoOrders?: boolean
  manualOrders?: boolean
  singleItem?: boolean
  multiItem?: boolean
  prepaid?: boolean
}

export type BuildOrderWhereInput = {
  role: AdminRole
  userId: string
  groupAdminIds?: string[] | null
  date?: string | null
  from?: string | null
  to?: string | null
  filters?: OrderFilterInput
  includeDeleted?: boolean
  deletedOnly?: boolean
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dateWindow(value: string): { start: Date; end: Date } | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null
  const start = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

function addDateWindow(
  where: Prisma.OrderWhereInput,
  date?: string | null,
  from?: string | null,
  to?: string | null
) {
  const exactWindow = date ? dateWindow(date) : null
  const fromWindow = from ? dateWindow(from) : null
  const toWindow = to ? dateWindow(to) : null
  const start = exactWindow?.start ?? fromWindow?.start
  const end = exactWindow?.end ?? (toWindow ? toWindow.end : undefined)

  if (!start && !end) return

  const deliveryDate: Prisma.DateTimeNullableFilter = {}
  const createdAt: Prisma.DateTimeFilter = {}
  if (start) {
    deliveryDate.gte = start
    createdAt.gte = start
  }
  if (end) {
    deliveryDate.lt = end
    createdAt.lt = end
  }

  where.OR = [
    { deliveryDate },
    { deliveryDate: null, createdAt },
  ]
}

function addGroupedEnumFilter<T extends string>(
  where: Prisma.OrderWhereInput,
  values: T[],
  key: 'orderStatus' | 'paymentStatus' | 'paymentMethod'
) {
  if (values.length === 0) return
  where[key] = { in: values } as never
}

export function buildOrderWhere({
  role,
  userId,
  groupAdminIds,
  date,
  from,
  to,
  filters = {},
  includeDeleted = false,
  deletedOnly = false,
}: BuildOrderWhereInput): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {}

  if (deletedOnly) {
    where.deletedAt = { not: null }
  } else if (!includeDeleted) {
    where.deletedAt = null
  }

  if (role === 'MIDDLE_ADMIN' || role === 'LOW_ADMIN') {
    where.adminId = { in: groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [userId] }
  } else if (role === 'COURIER') {
    where.courierId = userId
  }

  if (role === 'COURIER') {
    const today = new Date().toISOString().slice(0, 10)
    addDateWindow(where, today, null, null)
  } else {
    addDateWindow(where, date, from, to)
  }

  const orderStatuses: OrderStatus[] = []
  if (filters.successful) orderStatuses.push(OrderStatus.DELIVERED)
  if (filters.failed) orderStatuses.push(OrderStatus.FAILED)
  if (filters.pending) orderStatuses.push(OrderStatus.PENDING)
  if (filters.inDelivery) orderStatuses.push(OrderStatus.IN_DELIVERY)
  addGroupedEnumFilter(where, orderStatuses, 'orderStatus')

  const paymentStatuses: PaymentStatus[] = []
  if (filters.paid) paymentStatuses.push(PaymentStatus.PAID)
  if (filters.unpaid) paymentStatuses.push(PaymentStatus.UNPAID)
  addGroupedEnumFilter(where, paymentStatuses, 'paymentStatus')

  const paymentMethods: PaymentMethod[] = []
  if (filters.card) paymentMethods.push(PaymentMethod.CARD)
  if (filters.cash) paymentMethods.push(PaymentMethod.CASH)
  addGroupedEnumFilter(where, paymentMethods, 'paymentMethod')

  const calories = [
    filters.calories1200 && 1200,
    filters.calories1600 && 1600,
    filters.calories2000 && 2000,
    filters.calories2500 && 2500,
    filters.calories3000 && 3000,
  ].filter((value): value is number => typeof value === 'number')
  if (calories.length > 0) where.calories = { in: calories }

  const autoOrderValues = [
    filters.autoOrders ? true : null,
    filters.manualOrders ? false : null,
  ].filter((value): value is boolean => typeof value === 'boolean')
  if (autoOrderValues.length === 1) where.fromAutoOrder = autoOrderValues[0]

  if (filters.singleItem && filters.multiItem) {
    // Both selections represent the full quantity domain, so no constraint is needed.
  } else if (filters.singleItem) {
    where.quantity = 1
  } else if (filters.multiItem) {
    where.quantity = { not: 1 }
  }

  if (filters.prepaid) where.isPrepaid = true

  return where
}

export function parseOrderFilters(value: string | null): OrderFilterInput {
  if (!value) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as OrderFilterInput
  } catch {
    return {}
  }
}
