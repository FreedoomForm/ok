/**
 * Dashboard View — BFF aggregation for the admin dashboard overview.
 *
 * Aggregates data from multiple B0/B1 sources into a single response,
 * reducing the frontend's initial load from 5–8 separate API calls to one.
 *
 * Sections are opt-in via the `sections` parameter so the client can
 * request only what it needs on subsequent refreshes.
 *
 * Graceful degradation: if one section fails, the rest are still returned.
 * Failed sections include an `_error` field instead of data.
 *
 * Cached with B2 TTL (60s), invalidated on any mutation.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/modules/shared/validation/safe-json'
import {
  executeListOrders,
  executeGetOrderStats,
  type ListOrdersQuery,
  type OrderListFilters,
} from '@/modules/orders'
import type { OrderListItem, OrderStats } from '@/modules/orders'
import {
  executeListCustomers,
  type ListCustomersQuery,
} from '@/modules/customers'
import { cacheable, CacheKeys, CacheTTL } from '@/modules/shared/cache'
import { logger } from '@/modules/shared/logger'

// ── Section identifiers ─────────────────────────────────────────────────────

export type DashboardSection =
  | 'overview'
  | 'stats'
  | 'orders'
  | 'clients'
  | 'couriers'
  | 'sets'

const ALL_SECTIONS: DashboardSection[] = [
  'overview',
  'stats',
  'orders',
  'clients',
  'couriers',
  'sets',
]

// ── View input ──────────────────────────────────────────────────────────────

export interface DashboardViewInput {
  user: AuthUser
  sections: DashboardSection[]
  /** Order date range + filters (forwarded to executeListOrders) */
  orderFrom?: string | null
  orderTo?: string | null
  orderFilters?: OrderListFilters | null
}

// ── View response types ─────────────────────────────────────────────────────

export interface DashboardOverview {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  allowedTabs: string[] | null
}

export interface DashboardCourier {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  allowedTabs: string[]
  salary: number
  latitude: number | null
  longitude: number | null
}

export interface DashboardClient {
  id: string
  name: string
  nickName: string | null
  phone: string
  address: string
  calories: number
  planType: string
  dailyPrice: number
  balance: number
  notes: string
  specialFeatures: string
  deliveryDays: Record<string, boolean>
  autoOrdersEnabled: boolean
  isActive: boolean
  createdAt: string
  deletedAt?: string
  deletedBy?: string
  defaultCourierId: string | null
  defaultCourierName: string | null
  assignedSetId: string | null
  assignedSetName: string | null
  latitude: number | null
  longitude: number | null
}

export interface DashboardSet {
  id: string
  name: string
  description: string | null
  menuNumber: number
  calorieGroups: unknown
  isActive: boolean
  createdAt: string
  updatedAt: string
  adminId: string | null
}

/** A section that failed to load — still included so the client knows it was requested. */
export interface SectionError {
  _error: string
}

export interface DashboardViewData {
  overview?: DashboardOverview | SectionError
  stats?: OrderStats | SectionError
  orders?: OrderListItem[] | SectionError
  clients?: DashboardClient[] | SectionError
  couriers?: DashboardCourier[] | SectionError
  sets?: DashboardSet[] | SectionError
}

// ── Section loaders ─────────────────────────────────────────────────────────

async function loadOverview(user: AuthUser): Promise<DashboardOverview> {
  const admin = await db.admin.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      allowedTabs: true,
    },
  })

  if (!admin) {
    throw new Error(`Admin not found: ${user.id}`)
  }

  const allowedTabs = admin.allowedTabs
    ? (() => {
        const parsed = safeJsonParse<unknown>(admin.allowedTabs, [])
        return Array.isArray(parsed)
          ? parsed.filter((t): t is string => typeof t === 'string')
          : []
      })()
    : null

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive,
    allowedTabs,
  }
}

async function loadStats(user: AuthUser): Promise<OrderStats> {
  return executeGetOrderStats({ user })
}

async function loadOrders(
  user: AuthUser,
  from?: string | null,
  to?: string | null,
  filters?: OrderListFilters | null,
): Promise<OrderListItem[]> {
  const query: ListOrdersQuery = {
    user,
    from,
    to,
    filters,
  }
  const result = await executeListOrders(query)
  return result.items
}

/**
 * Load clients using the new customers module.
 * This replaces the legacy inline Prisma query that had N+1 issues
 * (making separate queries for courier and set names).
 * The customers module uses Prisma `include` with select presets to
 * batch-load related data in a single query.
 */
async function loadClients(user: AuthUser): Promise<DashboardClient[]> {
  const query: ListCustomersQuery = { user }
  const result = await executeListCustomers(query)

  // Map CustomerListItem → DashboardClient (same shape as before)
  return result.items as unknown as DashboardClient[]
}

async function loadCouriers(user: AuthUser): Promise<DashboardCourier[]> {
  const whereClause: Record<string, unknown> = {
    role: 'COURIER',
    isActive: true,
  }

  if (user.role !== 'SUPER_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    if (groupAdminIds) {
      whereClause.createdBy = { in: groupAdminIds }
    } else {
      whereClause.createdBy = user.id
    }
  }

  const couriers = await db.admin.findMany({
    where: whereClause,
    select: {
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
    },
    orderBy: { createdAt: 'desc' },
  })

  return couriers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    allowedTabs: (() => {
      const parsed = safeJsonParse<unknown>(c.allowedTabs, [])
      return Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === 'string')
        : []
    })(),
  }))
}

async function loadSets(user: AuthUser): Promise<DashboardSet[]> {
  const ownerAdminId = await getOwnerAdminId(user)

  const where: Record<string, unknown> = {}
  if (user.role !== 'SUPER_ADMIN') {
    if (!ownerAdminId) {
      return []
    }
    where.adminId = ownerAdminId
  } else if (ownerAdminId) {
    where.adminId = ownerAdminId
  }

  const sets = await db.menuSet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return sets.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    menuNumber: s.menuNumber,
    calorieGroups: s.calorieGroups,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    adminId: s.adminId,
  }))
}

// ── Safe section wrapper ────────────────────────────────────────────────────

/**
 * Execute a section loader, catching any error so other sections
 * are not affected.  On failure, returns a SectionError object.
 */
async function safeLoad<T>(
  sectionName: DashboardSection,
  loader: () => Promise<T>,
): Promise<T | SectionError> {
  try {
    return await loader()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    logger.error('Dashboard view section failed', {
      view: 'dashboard',
      section: sectionName,
      error: message,
    })
    return { _error: message }
  }
}

// ── Main view executor ──────────────────────────────────────────────────────

/**
 * Execute the dashboard view — aggregates multiple data sections into
 * a single response object.
 *
 * Each section is loaded independently; partial failures are captured
 * as `SectionError` objects rather than aborting the entire response.
 *
 * The entire response is cached with B2 TTL (60s).
 */
export async function executeDashboardView(
  input: DashboardViewInput,
): Promise<DashboardViewData> {
  const { user, sections, orderFrom, orderTo, orderFilters } = input

  // Build cache key
  const sectionsKey = sections.sort().join(',')
  const cacheKey = CacheKeys.dashboardView(user.id, sectionsKey)

  return cacheable(async () => {
    // Normalize sections — default to all if empty
    const requested = sections.length > 0 ? sections : ALL_SECTIONS

    const result: DashboardViewData = {}

    // Run all requested sections concurrently
    const tasks: Promise<void>[] = []

    if (requested.includes('overview')) {
      tasks.push(
        safeLoad('overview', () => loadOverview(user)).then(
          (data) => { result.overview = data },
        ),
      )
    }

    if (requested.includes('stats')) {
      tasks.push(
        safeLoad('stats', () => loadStats(user)).then(
          (data) => { result.stats = data },
        ),
      )
    }

    if (requested.includes('orders')) {
      tasks.push(
        safeLoad('orders', () => loadOrders(user, orderFrom, orderTo, orderFilters)).then(
          (data) => { result.orders = data },
        ),
      )
    }

    if (requested.includes('clients')) {
      tasks.push(
        safeLoad('clients', () => loadClients(user)).then(
          (data) => { result.clients = data },
        ),
      )
    }

    if (requested.includes('couriers')) {
      tasks.push(
        safeLoad('couriers', () => loadCouriers(user)).then(
          (data) => { result.couriers = data },
        ),
      )
    }

    if (requested.includes('sets')) {
      tasks.push(
        safeLoad('sets', () => loadSets(user)).then(
          (data) => { result.sets = data },
        ),
      )
    }

    await Promise.all(tasks)

    return result
  }, cacheKey, CacheTTL.B2)
}

// ── Parse helper for the API route ──────────────────────────────────────────

/**
 * Parse the comma-separated `sections` query parameter.
 * Returns all sections if the parameter is missing or empty.
 */
export function parseSections(raw: string | null): DashboardSection[] {
  if (!raw || raw.trim() === '') return ALL_SECTIONS

  const requested = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is DashboardSection =>
      (ALL_SECTIONS as readonly string[]).includes(s),
    )

  return requested.length > 0 ? requested : ALL_SECTIONS
}
