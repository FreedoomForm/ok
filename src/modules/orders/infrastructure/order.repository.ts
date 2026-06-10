/**
 * Order Repository — Data access layer for the Orders module.
 *
 * Encapsulates all Prisma queries for orders, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 * - **Data isolation** — Accept scoped `adminId` arrays so callers
 *   don't need to know about role-based filtering internals.
 *
 * The repository is intentionally stateless (all methods are plain
 * async functions).  This keeps it easy to test and compose.
 */

import { db } from '@/modules/shared/db'
import { Prisma, type OrderStatus as PrismaOrderStatus } from '@prisma/client'
import { encodeCursor, decodeCursor, type PaginatedResult } from '@/modules/shared/validation'
import type {
  OrderListItem,
  OrderDetail,
  OrderStatus,
  OrderTimelineEvent,
  OrderStats,
  OrderCustomerSnapshot,
  OrderListFilters,
  CustomerOrderTracking,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Customer fields included in every order query. */
const CUSTOMER_SELECT = {
  name: true,
  phone: true,
  assignedSetId: true,
  assignedSet: { select: { id: true, name: true } },
} as const

/** Courier fields included in list queries. */
const COURIER_SELECT = {
  id: true,
  name: true,
} as const

/** Full order select for list views — excludes heavy audit fields. */
const ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  customerId: true,
  deliveryDate: true,
  deliveryAddress: true,
  deliveryTime: true,
  quantity: true,
  calories: true,
  specialFeatures: true,
  paymentStatus: true,
  paymentMethod: true,
  isPrepaid: true,
  amountReceived: true,
  courierId: true,
  fromAutoOrder: true,
  orderType: true,
  priority: true,
  sourceChannel: true,
  latitude: true,
  longitude: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: CUSTOMER_SELECT },
  courier: { select: COURIER_SELECT },
} as const

/** Full order select for detail views — includes all fields. */
const ORDER_DETAIL_SELECT = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  customerId: true,
  adminId: true,
  deliveryDate: true,
  deliveryAddress: true,
  deliveryTime: true,
  quantity: true,
  calories: true,
  specialFeatures: true,
  paymentStatus: true,
  paymentMethod: true,
  isPrepaid: true,
  amountReceived: true,
  courierId: true,
  fromAutoOrder: true,
  orderType: true,
  priority: true,
  sourceChannel: true,
  latitude: true,
  longitude: true,
  etaMinutes: true,
  routeDistanceKm: true,
  routeDurationMin: true,
  sequenceInRoute: true,
  customerRating: true,
  customerFeedback: true,
  lastLatitude: true,
  lastLongitude: true,
  lastLocationAt: true,
  statusChangedAt: true,
  assignedAt: true,
  pickedUpAt: true,
  pausedAt: true,
  resumedAt: true,
  deliveredAt: true,
  failedAt: true,
  canceledAt: true,
  confirmedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: CUSTOMER_SELECT },
  courier: { select: COURIER_SELECT },
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

/** Inferred type from the Prisma list select preset. */
type OrderListRow = Prisma.OrderGetPayload<{ select: typeof ORDER_LIST_SELECT }>
/** Inferred type from the Prisma detail select preset. */
type OrderDetailRow = Prisma.OrderGetPayload<{ select: typeof ORDER_DETAIL_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

/** Format a date value as YYYY-MM-DD, falling back to the createdAt. */
export function formatDeliveryDate(
  deliveryDate: Date | null,
  createdAt: Date,
): string {
  return deliveryDate
    ? new Date(deliveryDate).toISOString().split('T')[0]
    : new Date(createdAt).toISOString().split('T')[0]
}

/** Build the customer snapshot from a Prisma customer include. */
export function toCustomerSnapshot(
  customer: OrderListRow['customer'],
): OrderCustomerSnapshot {
  return {
    name: customer?.name || 'Неизвестный клиент',
    phone: customer?.phone || 'Нет телефона',
    assignedSetId: customer?.assignedSetId || null,
    assignedSetName: (customer as any)?.assignedSet?.name || null,
  }
}

/** Map a Prisma list row to an OrderListItem DTO. */
export function toListItem(row: OrderListRow): OrderListItem {
  const customer = toCustomerSnapshot(row.customer)
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    orderStatus: row.orderStatus as OrderListItem['orderStatus'],
    customerId: row.customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    assignedSetId: customer.assignedSetId,
    assignedSetName: customer.assignedSetName,
    customer,
    deliveryDate: formatDeliveryDate(row.deliveryDate, row.createdAt),
    deliveryAddress: row.deliveryAddress,
    deliveryTime: row.deliveryTime,
    quantity: row.quantity,
    calories: row.calories,
    specialFeatures: row.specialFeatures,
    paymentStatus: row.paymentStatus as OrderListItem['paymentStatus'],
    paymentMethod: row.paymentMethod as OrderListItem['paymentMethod'],
    isPrepaid: row.isPrepaid,
    amountReceived: row.amountReceived,
    courierId: row.courierId,
    courierName: row.courier?.name || null,
    isAutoOrder: row.fromAutoOrder,
    orderType: row.orderType as OrderListItem['orderType'],
    priority: row.priority,
    sourceChannel: row.sourceChannel,
    latitude: row.latitude,
    longitude: row.longitude,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Map a Prisma detail row to an OrderDetail DTO. */
export function toDetail(row: OrderDetailRow): OrderDetail {
  const customer = toCustomerSnapshot(row.customer)
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    orderStatus: row.orderStatus as OrderDetail['orderStatus'],
    customerId: row.customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    assignedSetId: customer.assignedSetId,
    assignedSetName: customer.assignedSetName,
    customer,
    deliveryDate: formatDeliveryDate(row.deliveryDate, row.createdAt),
    deliveryAddress: row.deliveryAddress,
    deliveryTime: row.deliveryTime,
    quantity: row.quantity,
    calories: row.calories,
    specialFeatures: row.specialFeatures,
    paymentStatus: row.paymentStatus as OrderDetail['paymentStatus'],
    paymentMethod: row.paymentMethod as OrderDetail['paymentMethod'],
    isPrepaid: row.isPrepaid,
    amountReceived: row.amountReceived,
    courierId: row.courierId,
    courierName: row.courier?.name || null,
    isAutoOrder: row.fromAutoOrder,
    orderType: row.orderType as OrderDetail['orderType'],
    priority: row.priority,
    sourceChannel: row.sourceChannel,
    latitude: row.latitude,
    longitude: row.longitude,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    adminId: row.adminId,
    etaMinutes: row.etaMinutes,
    routeDistanceKm: row.routeDistanceKm,
    routeDurationMin: row.routeDurationMin,
    sequenceInRoute: row.sequenceInRoute,
    customerRating: row.customerRating,
    customerFeedback: row.customerFeedback,
    lastLatitude: row.lastLatitude,
    lastLongitude: row.lastLongitude,
    lastLocationAt: row.lastLocationAt?.toISOString() ?? null,
    statusChangedAt: row.statusChangedAt?.toISOString() ?? null,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    pickedUpAt: row.pickedUpAt?.toISOString() ?? null,
    pausedAt: row.pausedAt?.toISOString() ?? null,
    resumedAt: row.resumedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── Filter logic ─────────────────────────────────────────────────────────────

/**
 * Apply in-memory filter groups to an order list.
 *
 * Logic: OR within each filter category, AND between categories.
 */
function applyFilters(
  orders: OrderListRow[],
  filters: OrderListFilters,
): OrderListRow[] {
  if (!filters || Object.keys(filters).length === 0) return orders

  return orders.filter((order) => {
    const deliveryStatusFilters: string[] = []
    if (filters.successful) deliveryStatusFilters.push('DELIVERED')
    if (filters.failed) deliveryStatusFilters.push('FAILED')
    if (filters.pending) deliveryStatusFilters.push('PENDING')
    if (filters.inDelivery) deliveryStatusFilters.push('IN_DELIVERY')

    if (
      deliveryStatusFilters.length > 0 &&
      !deliveryStatusFilters.includes(order.orderStatus)
    )
      return false

    const paymentStatusFilters: string[] = []
    if (filters.paid) paymentStatusFilters.push('PAID')
    if (filters.unpaid) paymentStatusFilters.push('UNPAID')

    if (
      paymentStatusFilters.length > 0 &&
      !paymentStatusFilters.includes(order.paymentStatus)
    )
      return false

    const paymentMethodFilters: string[] = []
    if (filters.card) paymentMethodFilters.push('CARD')
    if (filters.cash) paymentMethodFilters.push('CASH')

    if (
      paymentMethodFilters.length > 0 &&
      !paymentMethodFilters.includes(order.paymentMethod)
    )
      return false

    const calorieFilters: number[] = []
    if (filters.calories1200) calorieFilters.push(1200)
    if (filters.calories1600) calorieFilters.push(1600)
    if (filters.calories2000) calorieFilters.push(2000)
    if (filters.calories2500) calorieFilters.push(2500)
    if (filters.calories3000) calorieFilters.push(3000)

    if (calorieFilters.length > 0 && !calorieFilters.includes(order.calories))
      return false

    const orderTypeFilters: boolean[] = []
    if (filters.autoOrders) orderTypeFilters.push(true)
    if (filters.manualOrders) orderTypeFilters.push(false)

    if (
      orderTypeFilters.length > 0 &&
      !orderTypeFilters.includes(order.fromAutoOrder)
    )
      return false

    const quantityFilters: string[] = []
    if (filters.singleItem) quantityFilters.push('single')
    if (filters.multiItem) quantityFilters.push('multi')

    if (quantityFilters.length > 0) {
      const isSingle = order.quantity === 1
      const matches =
        (quantityFilters.includes('single') && isSingle) ||
        (quantityFilters.includes('multi') && !isSingle)
      if (!matches) return false
    }

    if (filters.prepaid && !order.isPrepaid) return false

    return true
  })
}

// ── Date filtering ───────────────────────────────────────────────────────────

function filterByDate(orders: OrderListRow[], date: string): OrderListRow[] {
  return orders.filter((order) => {
    const orderDate = formatDeliveryDate(order.deliveryDate, order.createdAt)
    return orderDate === date
  })
}

function filterByDateRange(
  orders: OrderListRow[],
  from: string | null,
  to: string | null,
): OrderListRow[] {
  const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const fromIso = from && isIsoDate(from) ? from : null
  const toIso = to && isIsoDate(to) ? to : null

  if (!fromIso && !toIso) return orders

  return orders.filter((order) => {
    const orderDate = formatDeliveryDate(order.deliveryDate, order.createdAt)
    if (fromIso && orderDate < fromIso) return false
    if (toIso && orderDate > toIso) return false
    return true
  })
}

// ── Repository functions ─────────────────────────────────────────────────────

export interface ListOrdersInput {
  scopedAdminIds: string[] | null
  date?: string | null
  from?: string | null
  to?: string | null
  filters?: OrderListFilters | null
  includeDeleted?: boolean
  deletedOnly?: boolean
  courierFilter?: { courierId: string } | null
  cursor?: string
  limit?: number
}

/**
 * List orders with role-based data isolation, date filters,
 * and multi-category filter logic.
 * Supports cursor-based pagination with stable sort (updatedAt DESC, id DESC).
 */
export async function listOrders(
  input: ListOrdersInput,
): Promise<PaginatedResult<OrderListItem>> {
  const {
    scopedAdminIds,
    date,
    from,
    to,
    filters,
    includeDeleted,
    deletedOnly,
    courierFilter,
    cursor,
    limit = 25,
  } = input

  const where: Prisma.OrderWhereInput = {}

  if (deletedOnly) {
    where.deletedAt = { not: null }
  } else if (!includeDeleted) {
    where.deletedAt = null
  }

  if (scopedAdminIds && scopedAdminIds.length > 0) {
    where.adminId = { in: scopedAdminIds }
  }

  // Apply cursor filter for keyset pagination
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      const cursorUpdatedAt = decoded.updatedAt as string
      const cursorId = decoded.id as string
      if (cursorUpdatedAt && cursorId) {
        where.OR = [
          { updatedAt: { lt: new Date(cursorUpdatedAt) } },
          { updatedAt: { equals: new Date(cursorUpdatedAt) }, id: { lt: cursorId } },
        ]
      }
    }
  }

  // Fetch limit + 1 to determine hasMore
  const rows = await db.order.findMany({
    where,
    select: ORDER_LIST_SELECT,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  let filtered: OrderListRow[] = rows
  if (courierFilter) {
    const today = new Date().toISOString().split('T')[0]
    filtered = rows.filter(
      (o) =>
        formatDeliveryDate(o.deliveryDate, o.createdAt) === today &&
        o.courierId === courierFilter.courierId,
    )
  } else {
    if (date) {
      filtered = filterByDate(filtered, date)
    } else if (from || to) {
      filtered = filterByDateRange(filtered, from ?? null, to ?? null)
    }

    if (filters && Object.keys(filters).length > 0) {
      filtered = applyFilters(filtered, filters)
    }
  }

  // After in-memory filtering, apply pagination
  const hasMore = filtered.length > limit
  const paginatedRows = hasMore ? filtered.slice(0, limit) : filtered
  const items = paginatedRows.map(toListItem)

  const lastRow = paginatedRows[paginatedRows.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor({ updatedAt: lastRow.updatedAt.toISOString(), id: lastRow.id })
    : null

  return { items, nextCursor, hasMore }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetOrderDetailInput {
  orderId: string
  scopedAdminIds: string[] | null
}

/**
 * Get a single order by ID, with role-based access check.
 * Returns `null` if not found or outside the user's scope.
 */
export async function getOrderDetail(
  input: GetOrderDetailInput,
): Promise<OrderDetail | null> {
  const { orderId, scopedAdminIds } = input

  const where: Prisma.OrderWhereInput = { id: orderId }
  if (scopedAdminIds && scopedAdminIds.length > 0) {
    where.adminId = { in: scopedAdminIds }
  }

  const row = await db.order.findFirst({
    where,
    select: ORDER_DETAIL_SELECT,
  })

  if (!row) return null
  return toDetail(row)
}

// ─────────────────────────────────────────────────────────────────────────────

/** Customer-facing select: minimal order fields + live courier coordinates. */
const CUSTOMER_ORDER_TRACKING_SELECT = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  customerId: true,
  createdAt: true,
  deliveryDate: true,
  deliveryAddress: true,
  deliveryTime: true,
  quantity: true,
  calories: true,
  paymentStatus: true,
  etaMinutes: true,
  courier: {
    select: {
      name: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  },
} as const

type CustomerOrderTrackingRow = Prisma.OrderGetPayload<{
  select: typeof CUSTOMER_ORDER_TRACKING_SELECT
}>

/** Map a raw tracking row to the customer-facing DTO. */
export function toCustomerTracking(
  row: CustomerOrderTrackingRow,
): CustomerOrderTracking {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    orderStatus: row.orderStatus as OrderStatus,
    deliveryDate: formatDeliveryDate(row.deliveryDate, row.createdAt),
    deliveryAddress: row.deliveryAddress,
    deliveryTime: row.deliveryTime,
    quantity: row.quantity,
    calories: row.calories,
    paymentStatus: row.paymentStatus as OrderDetail['paymentStatus'],
    etaMinutes: row.etaMinutes,
    courier: row.courier
      ? {
          name: row.courier.name,
          phone: row.courier.phone ?? '',
          latitude: row.courier.latitude,
          longitude: row.courier.longitude,
        }
      : null,
  }
}

export interface GetCustomerOrderTrackingInput {
  orderId: string
  /** The authenticated customer's id — enforced as an ownership filter. */
  customerId: string
}

/**
 * Get a single order for a CUSTOMER, scoped to the orders they own.
 *
 * Ownership (`customerId`) is enforced **in the query**, so a customer can never
 * read another customer's order even by guessing an id. Returns `null` when the
 * order does not exist or is not owned by the customer (the route maps that to
 * a 404, not a 403, to avoid leaking existence).
 */
export async function getCustomerOrderTracking(
  input: GetCustomerOrderTrackingInput,
): Promise<CustomerOrderTracking | null> {
  const { orderId, customerId } = input

  const row = await db.order.findFirst({
    where: { id: orderId, customerId, deletedAt: null },
    select: CUSTOMER_ORDER_TRACKING_SELECT,
  })

  if (!row) return null
  return toCustomerTracking(row)
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetOrderTimelineInput {
  orderId: string
  scopedAdminIds: string[] | null
  limit?: number
}

/**
 * Get audit timeline events for an order.
 * First verifies the order is in scope, then returns events.
 */
export async function getOrderTimeline(
  input: GetOrderTimelineInput,
): Promise<{ orderId: string; events: OrderTimelineEvent[] } | null> {
  const { orderId, scopedAdminIds, limit = 120 } = input

  const orderWhere: Prisma.OrderWhereInput = { id: orderId }
  if (scopedAdminIds && scopedAdminIds.length > 0) {
    orderWhere.adminId = { in: scopedAdminIds }
  }

  const orderExists = await db.order.findFirst({
    where: orderWhere,
    select: { id: true },
  })
  if (!orderExists) return null

  const events = await db.orderAuditEvent.findMany({
    where: { orderId },
    include: {
      actorAdmin: { select: { id: true, name: true, role: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })

  return {
    orderId,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType as OrderTimelineEvent['eventType'],
      occurredAt: event.occurredAt.toISOString(),
      actorRole: event.actorRole,
      actorName: event.actorName || event.actorAdmin?.name || 'System',
      previousStatus: event.previousStatus,
      nextStatus: event.nextStatus,
      message: event.message,
      payload: event.payload,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetOrderStatsInput {
  scopedAdminIds: string[] | null
}

/**
 * Compute aggregate order statistics.
 */
export async function getOrderStats(
  input: GetOrderStatsInput,
): Promise<OrderStats> {
  const { scopedAdminIds } = input

  const where: Prisma.OrderWhereInput = {}
  if (scopedAdminIds && scopedAdminIds.length > 0) {
    where.adminId = { in: scopedAdminIds }
  }

  const allOrders = await db.order.findMany({
    where,
    select: {
      orderStatus: true,
      paymentMethod: true,
      isPrepaid: true,
      calories: true,
      quantity: true,
      specialFeatures: true,
      customer: {
        select: { deliveryDays: true },
      },
    },
  })

  const isDailyCustomer = (deliveryDays: string | null): boolean => {
    if (!deliveryDays) return false
    try {
      const days = JSON.parse(deliveryDays) as Record<string, boolean>
      return !!(
        days.monday &&
        days.tuesday &&
        days.wednesday &&
        days.thursday &&
        days.friday &&
        days.saturday &&
        days.sunday
      )
    } catch {
      return false
    }
  }

  const isEvenDayCustomer = (deliveryDays: string | null): boolean => {
    if (!deliveryDays) return false
    try {
      const days = JSON.parse(deliveryDays) as Record<string, boolean>
      const selectedDays = Object.values(days).filter(Boolean).length
      return selectedDays >= 3 && selectedDays <= 4 && !isDailyCustomer(deliveryDays)
    } catch {
      return false
    }
  }

  const isOddDayCustomer = (deliveryDays: string | null): boolean => {
    if (!deliveryDays) return false
    try {
      const days = JSON.parse(deliveryDays) as Record<string, boolean>
      const selectedDays = Object.values(days).filter(Boolean).length
      return (
        selectedDays >= 3 &&
        selectedDays <= 4 &&
        !isDailyCustomer(deliveryDays) &&
        !isEvenDayCustomer(deliveryDays)
      )
    } catch {
      return false
    }
  }

  return {
    successfulOrders: allOrders.filter((o) => o.orderStatus === 'DELIVERED').length,
    failedOrders: allOrders.filter((o) => o.orderStatus === 'FAILED').length,
    pendingOrders: allOrders.filter((o) => o.orderStatus === 'PENDING').length,
    inDeliveryOrders: allOrders.filter((o) => o.orderStatus === 'IN_DELIVERY').length,
    pausedOrders: allOrders.filter((o) => o.orderStatus === 'PAUSED').length,
    prepaidOrders: allOrders.filter((o) => o.isPrepaid).length,
    unpaidOrders: allOrders.filter((o) => !o.isPrepaid).length,
    cardOrders: allOrders.filter((o) => o.paymentMethod === 'CARD').length,
    cashOrders: allOrders.filter((o) => o.paymentMethod === 'CASH').length,
    dailyCustomers: allOrders.filter(
      (o) => o.customer && isDailyCustomer(o.customer.deliveryDays),
    ).length,
    evenDayCustomers: allOrders.filter(
      (o) => o.customer && isEvenDayCustomer(o.customer.deliveryDays),
    ).length,
    oddDayCustomers: allOrders.filter(
      (o) => o.customer && isOddDayCustomer(o.customer.deliveryDays),
    ).length,
    specialPreferenceCustomers: allOrders.filter(
      (o) => o.specialFeatures && o.specialFeatures !== '{}' && o.specialFeatures !== '',
    ).length,
    orders1200: allOrders.filter((o) => o.calories === 1200).length,
    orders1600: allOrders.filter((o) => o.calories === 1600).length,
    orders2000: allOrders.filter((o) => o.calories === 2000).length,
    orders2500: allOrders.filter((o) => o.calories === 2500).length,
    orders3000: allOrders.filter((o) => o.calories === 3000).length,
    singleItemOrders: allOrders.filter((o) => o.quantity === 1).length,
    multiItemOrders: allOrders.filter((o) => o.quantity >= 2).length,
  }
}

// ── Batch operations ────────────────────────────────────────────────────────

export interface BatchGetOrdersInput {
  ids: string[]
  scopedAdminIds: string[] | null
}

/**
 * Batch fetch orders by IDs with role-based data isolation.
 * Returns found items and a list of IDs that weren't found.
 */
export async function batchGetOrders(
  input: BatchGetOrdersInput,
): Promise<{ items: OrderListItem[]; notFound: string[] }> {
  const { ids, scopedAdminIds } = input

  const where: Prisma.OrderWhereInput = {
    id: { in: ids },
    deletedAt: null,
  }

  if (scopedAdminIds && scopedAdminIds.length > 0) {
    where.adminId = { in: scopedAdminIds }
  }

  const rows = await db.order.findMany({
    where,
    select: ORDER_LIST_SELECT,
  })

  const foundIds = new Set(rows.map((r) => r.id))
  const notFound = ids.filter((id) => !foundIds.has(id))

  return {
    items: rows.map(toListItem),
    notFound,
  }
}

// ── Write operations ────────────────────────────────────────────────────────

export interface CreateOrderInput {
  customerId: string
  adminId: string
  courierId: string | null
  deliveryAddress: string
  deliveryDate: Date | null
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  paymentStatus: string
  paymentMethod: string
  isPrepaid: boolean
  amountReceived: number | null
  orderStatus: string
  sourceChannel: string
  priority: number
  etaMinutes: number | null
  routeDistanceKm: number | null
  routeDurationMin: number | null
  sequenceInRoute: number | null
  latitude: number | null
  longitude: number | null
}

/**
 * Create a new order with auto-incrementing orderNumber.
 * Returns the full OrderDetail DTO.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderDetail> {
  const getNextOrderNumber = async () => {
    const lastOrder = await db.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    return lastOrder ? lastOrder.orderNumber + 1 : 1
  }

  const nextOrderNumber = await getNextOrderNumber()

  const row = await db.order.create({
    data: {
      orderNumber: nextOrderNumber,
      customerId: input.customerId,
      adminId: input.adminId,
      courierId: input.courierId,
      deliveryAddress: input.deliveryAddress,
      deliveryDate: input.deliveryDate,
      deliveryTime: input.deliveryTime,
      quantity: input.quantity,
      calories: input.calories,
      specialFeatures: input.specialFeatures,
      paymentStatus: input.paymentStatus as any,
      paymentMethod: input.paymentMethod as any,
      isPrepaid: input.isPrepaid,
      amountReceived: input.amountReceived,
      orderStatus: input.orderStatus as any,
      sourceChannel: input.sourceChannel,
      priority: input.priority,
      etaMinutes: input.etaMinutes,
      routeDistanceKm: input.routeDistanceKm,
      routeDurationMin: input.routeDurationMin,
      sequenceInRoute: input.sequenceInRoute,
      statusChangedAt: new Date(),
      assignedAt: input.courierId ? new Date() : null,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    select: ORDER_DETAIL_SELECT,
  })

  return toDetail(row)
}

// ─────────────────────────────────────────────────────────────────────────────

export type UpdateOrderInput = Record<string, unknown>

/**
 * Update an order by ID with arbitrary fields.
 * Returns the full OrderDetail DTO after update.
 */
export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput,
): Promise<OrderDetail> {
  const row = await db.order.update({
    where: { id: orderId },
    data: input as any,
    select: ORDER_DETAIL_SELECT,
  })

  return toDetail(row)
}
