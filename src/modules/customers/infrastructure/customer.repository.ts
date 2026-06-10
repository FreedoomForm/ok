/**
 * Customer Repository — Data access layer for the Customers module.
 *
 * Encapsulates all Prisma queries for customers, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 * - **Batch loading** — Fix N+1 by using Prisma `include` with select
 *   presets to batch-load related data (defaultCourier, assignedSet).
 * - **Data isolation** — Accept scoped `createdBy` arrays so callers
 *   don't need to know about role-based filtering internals.
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import { safeJsonParse } from '@/modules/shared/validation/safe-json'
import { encodeCursor, decodeCursor, type PaginatedResult } from '@/modules/shared/validation'
import type {
  CustomerListItem,
  CustomerDetail,
  CustomerBinItem,
  CustomerSummary,
  DeliveryDays,
  PlanType,
} from '../contracts'

// ── Default values ───────────────────────────────────────────────────────────

const DEFAULT_DELIVERY_DAYS: DeliveryDays = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
}

// ── Prisma select presets ────────────────────────────────────────────────────

/** Courier fields included in customer list queries. */
const COURIER_SELECT = {
  id: true,
  name: true,
} as const

/** Assigned set fields included in customer list queries. */
const SET_SELECT = {
  id: true,
  name: true,
} as const

/** Full customer select for list views — batch loads related data in one query. */
const CUSTOMER_LIST_SELECT = {
  id: true,
  name: true,
  nickName: true,
  phone: true,
  address: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  balance: true,
  notes: true,
  preferences: true,
  deliveryDays: true,
  autoOrdersEnabled: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  latitude: true,
  longitude: true,
  defaultCourierId: true,
  assignedSetId: true,
  defaultCourier: { select: COURIER_SELECT },
  assignedSet: { select: SET_SELECT },
} as const

/** Full customer select for detail views — includes all fields. */
const CUSTOMER_DETAIL_SELECT = {
  id: true,
  name: true,
  nickName: true,
  phone: true,
  address: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  balance: true,
  notes: true,
  preferences: true,
  deliveryDays: true,
  autoOrdersEnabled: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  createdBy: true,
  latitude: true,
  longitude: true,
  defaultCourierId: true,
  assignedSetId: true,
  defaultCourier: { select: COURIER_SELECT },
  assignedSet: { select: SET_SELECT },
} as const

/** Minimal select for the recycle bin. */
const CUSTOMER_BIN_SELECT = {
  id: true,
  name: true,
  phone: true,
  address: true,
  isActive: true,
  deletedAt: true,
  deletedBy: true,
  createdAt: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type CustomerListRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_LIST_SELECT }>
type CustomerDetailRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_DETAIL_SELECT }>
type CustomerBinRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_BIN_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function parseDeliveryDays(raw: string | null): DeliveryDays {
  const parsed = safeJsonParse<unknown>(raw, DEFAULT_DELIVERY_DAYS)
  return typeof parsed === 'object' && parsed !== null
    ? (parsed as DeliveryDays)
    : DEFAULT_DELIVERY_DAYS
}

function toListItem(row: CustomerListRow): CustomerListItem {
  return {
    id: row.id,
    name: row.name,
    nickName: row.nickName,
    phone: row.phone,
    address: row.address,
    calories: row.calories || 2000,
    planType: (row.planType as PlanType) || 'CLASSIC',
    dailyPrice: row.dailyPrice || 84000,
    balance: typeof row.balance === 'number' ? row.balance : 0,
    notes: row.notes || '',
    specialFeatures: row.preferences || '',
    deliveryDays: parseDeliveryDays(row.deliveryDays),
    autoOrdersEnabled: row.autoOrdersEnabled,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    defaultCourierId: row.defaultCourierId,
    defaultCourierName: row.defaultCourier?.name ?? null,
    assignedSetId: row.assignedSetId,
    assignedSetName: row.assignedSet?.name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

function toDetail(row: CustomerDetailRow): CustomerDetail {
  return {
    id: row.id,
    name: row.name,
    nickName: row.nickName,
    phone: row.phone,
    address: row.address,
    calories: row.calories || 2000,
    planType: (row.planType as PlanType) || 'CLASSIC',
    dailyPrice: row.dailyPrice || 84000,
    balance: typeof row.balance === 'number' ? row.balance : 0,
    notes: row.notes || '',
    specialFeatures: row.preferences || '',
    deliveryDays: parseDeliveryDays(row.deliveryDays),
    autoOrdersEnabled: row.autoOrdersEnabled,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deletedBy: row.deletedBy ?? null,
    createdBy: row.createdBy ?? null,
    defaultCourierId: row.defaultCourierId,
    defaultCourierName: row.defaultCourier?.name ?? null,
    assignedSetId: row.assignedSetId,
    assignedSetName: row.assignedSet?.name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

function toBinItem(row: CustomerBinRow): CustomerBinItem {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    isActive: row.isActive,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deletedBy: row.deletedBy ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

// ── Repository functions ─────────────────────────────────────────────────────

export interface ListCustomersInput {
  scopedCreatedBy: string[] | null
  deletedOnly?: boolean
  cursor?: string
  limit?: number
}

/**
 * List customers with role-based data isolation.
 * Uses Prisma `include` with select presets to batch-load related
 * data (defaultCourier, assignedSet) — fixing the N+1 issue.
 * Supports cursor-based pagination with stable sort (updatedAt DESC, id DESC).
 */
export async function listCustomers(
  input: ListCustomersInput,
): Promise<PaginatedResult<CustomerListItem>> {
  const { scopedCreatedBy, deletedOnly, cursor, limit = 25 } = input

  const where: Prisma.CustomerWhereInput = {}

  if (deletedOnly) {
    where.deletedAt = { not: null }
  } else {
    where.deletedAt = null
  }

  if (scopedCreatedBy && scopedCreatedBy.length > 0) {
    where.createdBy = { in: scopedCreatedBy }
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
  const rows = await db.customer.findMany({
    where,
    select: CUSTOMER_LIST_SELECT,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const lastRow = items[items.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor({ updatedAt: lastRow.updatedAt.toISOString(), id: lastRow.id })
    : null

  return {
    items: items.map(toListItem),
    nextCursor,
    hasMore,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetCustomerDetailInput {
  customerId: string
  scopedCreatedBy: string[] | null
}

/**
 * Get a single customer by ID, with role-based access check.
 * Returns `null` if not found or outside the user's scope.
 */
export async function getCustomerDetail(
  input: GetCustomerDetailInput,
): Promise<CustomerDetail | null> {
  const { customerId, scopedCreatedBy } = input

  const where: Prisma.CustomerWhereInput = { id: customerId }
  if (scopedCreatedBy && scopedCreatedBy.length > 0) {
    where.createdBy = { in: scopedCreatedBy }
  }

  const row = await db.customer.findFirst({
    where,
    select: CUSTOMER_DETAIL_SELECT,
  })

  if (!row) return null
  return toDetail(row)
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ListBinCustomersInput {
  scopedCreatedBy: string[] | null
}

/**
 * List soft-deleted customers (recycle bin).
 */
export async function listBinCustomers(
  input: ListBinCustomersInput,
): Promise<CustomerBinItem[]> {
  const { scopedCreatedBy } = input

  const where: Prisma.CustomerWhereInput = {
    deletedAt: { not: null },
  }

  if (scopedCreatedBy && scopedCreatedBy.length > 0) {
    where.createdBy = { in: scopedCreatedBy }
  }

  const rows = await db.customer.findMany({
    where,
    select: CUSTOMER_BIN_SELECT,
    orderBy: { deletedAt: 'desc' },
  })

  return rows.map(toBinItem)
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetCustomerSummaryInput {
  scopedCreatedBy: string[] | null
}

/**
 * Compute aggregate customer statistics.
 */
export async function getCustomerSummary(
  input: GetCustomerSummaryInput,
): Promise<CustomerSummary> {
  const { scopedCreatedBy } = input

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  }

  if (scopedCreatedBy && scopedCreatedBy.length > 0) {
    where.createdBy = { in: scopedCreatedBy }
  }

  const allCustomers = await db.customer.findMany({
    where,
    select: {
      isActive: true,
      autoOrdersEnabled: true,
    },
  })

  return {
    total: allCustomers.length,
    active: allCustomers.filter((c) => c.isActive).length,
    inactive: allCustomers.filter((c) => !c.isActive).length,
    withAutoOrders: allCustomers.filter((c) => c.autoOrdersEnabled).length,
    withoutAutoOrders: allCustomers.filter((c) => !c.autoOrdersEnabled).length,
  }
}

// ── Batch operations ────────────────────────────────────────────────────────

export interface BatchGetCustomersInput {
  ids: string[]
  scopedCreatedBy: string[] | null
}

/**
 * Batch fetch customers by IDs with role-based data isolation.
 * Returns found items and a list of IDs that weren't found.
 */
export async function batchGetCustomers(
  input: BatchGetCustomersInput,
): Promise<{ items: CustomerListItem[]; notFound: string[] }> {
  const { ids, scopedCreatedBy } = input

  const where: Prisma.CustomerWhereInput = {
    id: { in: ids },
    deletedAt: null,
  }

  if (scopedCreatedBy && scopedCreatedBy.length > 0) {
    where.createdBy = { in: scopedCreatedBy }
  }

  const rows = await db.customer.findMany({
    where,
    select: CUSTOMER_LIST_SELECT,
  })

  const foundIds = new Set(rows.map((r) => r.id))
  const notFound = ids.filter((id) => !foundIds.has(id))

  return {
    items: rows.map(toListItem),
    notFound,
  }
}

// ── Write operations ────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  name: string
  nickName?: string | null
  phone: string
  address: string
  preferences?: string
  orderPattern?: string
  deliveryDays?: string
  calories?: number
  planType?: string
  dailyPrice?: number
  notes?: string
  autoOrdersEnabled?: boolean
  isActive?: boolean
  latitude?: number | null
  longitude?: number | null
  defaultCourierId?: string | null
  assignedSetId?: string | null
  createdBy?: string | null
  password?: string
}

/**
 * Create a new customer. Returns the CustomerDetail DTO.
 */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerDetail> {
  const row = await db.customer.create({
    data: {
      name: input.name,
      nickName: input.nickName ?? null,
      phone: input.phone,
      address: input.address,
      preferences: input.preferences || '',
      orderPattern: input.orderPattern || JSON.stringify(DEFAULT_DELIVERY_DAYS),
      deliveryDays: input.deliveryDays || JSON.stringify(DEFAULT_DELIVERY_DAYS),
      calories: input.calories || 2000,
      planType: (input.planType as any) || 'CLASSIC',
      dailyPrice: input.dailyPrice || 84000,
      notes: input.notes || '',
      autoOrdersEnabled: input.autoOrdersEnabled ?? true,
      isActive: input.isActive ?? true,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      defaultCourierId: input.defaultCourierId ?? null,
      assignedSetId: input.assignedSetId ?? null,
      createdBy: input.createdBy ?? null,
      password: input.password ?? undefined,
    } as any,
    select: CUSTOMER_DETAIL_SELECT,
  })

  return toDetail(row)
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateCustomerInput {
  [key: string]: unknown
}

/**
 * Update a customer by ID with arbitrary fields.
 * Returns the CustomerDetail DTO after update.
 */
export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerDetail> {
  const row = await db.customer.update({
    where: { id: customerId },
    data: input as any,
    select: CUSTOMER_DETAIL_SELECT,
  })

  return toDetail(row)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve which customer IDs are in scope for the given createdBy admin IDs.
 */
export async function resolveScopedCustomerIds(
  customerIds: string[],
  scopedCreatedBy: string[] | null,
): Promise<string[]> {
  if (!scopedCreatedBy) return customerIds

  const rows = await db.customer.findMany({
    where: {
      id: { in: customerIds },
      createdBy: { in: scopedCreatedBy },
    },
    select: { id: true },
  })

  return rows.map((r) => r.id)
}
