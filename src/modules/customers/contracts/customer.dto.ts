/**
 * Customer DTOs — Data Transfer Objects for the Customers module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend). No Prisma types leak
 * through these interfaces.
 *
 * Convention:
 * - `ListItem` — lightweight row for list/table views
 * - `Detail`   — full object for detail views
 * - `BinItem`  — lightweight for bin (soft-deleted) views
 * - `Summary`  — minimal info for selects/dropdowns
 */

// ── Enums (mirror Prisma enums without importing @prisma/client) ────────────

export type PlanType = 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC'

// ── Embedded objects ─────────────────────────────────────────────────────────

export interface DeliveryDays {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export const DEFAULT_DELIVERY_DAYS: DeliveryDays = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
}

// ── List Item (lightweight, for table/list views) ────────────────────────────

export interface CustomerListItem {
  id: string
  name: string
  nickName: string | null
  phone: string
  address: string
  calories: number
  planType: PlanType
  dailyPrice: number
  balance: number
  notes: string
  specialFeatures: string
  deliveryDays: DeliveryDays
  autoOrdersEnabled: boolean
  isActive: boolean
  createdAt: string
  latitude: number | null
  longitude: number | null
  defaultCourierId: string | null
  defaultCourierName: string | null
  assignedSetId: string | null
  assignedSetName: string | null
  deletedAt: string | null
}

// ── Detail (full object, for detail/edit views) ──────────────────────────────

export interface CustomerDetail extends CustomerListItem {
  updatedAt: string
  createdBy: string | null
  deletedBy: string | null
  orderCount?: number
}

// ── Bin Item (soft-deleted, lightweight) ─────────────────────────────────────

export interface CustomerBinItem {
  id: string
  name: string
  phone: string
  address: string
  isActive: boolean
  deletedAt: string | null
  deletedBy: string | null
  createdAt: string
}

// ── Summary (for selects/dropdowns) ──────────────────────────────────────────

export interface CustomerSummary {
  id: string
  name: string
  phone: string
  address: string
  isActive: boolean
}

// ── Cursor pagination ────────────────────────────────────────────────────────

export interface CursorPage<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    hasMore: boolean
    total?: number
  }
}

// ── Filter input for list queries ────────────────────────────────────────────

export interface CustomerListFilters {
  isActive?: boolean
  search?: string
  planType?: PlanType
}
