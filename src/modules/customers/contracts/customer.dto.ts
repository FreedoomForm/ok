/**
 * Customer DTOs — Data Transfer Objects for the Customers module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 *
 * Convention:
 * - `ListItem` — lightweight row for list/table views
 * - `Detail`   — full object for detail/edit views
 * - `BinItem`  — minimal info for the recycle bin view
 * - `Summary`  — count-based stats
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
  defaultCourierId: string | null
  defaultCourierName: string | null
  assignedSetId: string | null
  assignedSetName: string | null
  latitude: number | null
  longitude: number | null
}

// ── Detail (full object, for detail/edit views) ──────────────────────────────

export interface CustomerDetail extends CustomerListItem {
  updatedAt: string
  deletedAt: string | null
  deletedBy: string | null
  createdBy: string | null
}

// ── Bin Item (minimal, for recycle bin views) ────────────────────────────────

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

// ── Customer Summary (stats) ─────────────────────────────────────────────────

export interface CustomerSummary {
  total: number
  active: number
  inactive: number
  withAutoOrders: number
  withoutAutoOrders: number
}

// ── Batch result ─────────────────────────────────────────────────────────────

export interface BatchResult {
  affectedCount: number
  skippedCount: number
}

// ── Soft-delete result ───────────────────────────────────────────────────────

export interface SoftDeleteResult extends BatchResult {
  deletedAutoOrders: number
}

// ── Permanent delete result ──────────────────────────────────────────────────

export interface PermanentDeleteResult {
  deletedClients: number
  deletedOrders: number
}

// ── Create Customer input ────────────────────────────────────────────────────

export interface CreateCustomerData {
  name: string
  nickName?: string
  phone: string
  address: string
  calories?: number | string
  planType?: string
  dailyPrice?: number | string
  notes?: string
  specialFeatures?: string
  deliveryDays?: DeliveryDays
  autoOrdersEnabled?: boolean
  latitude?: number | string | null
  longitude?: number | string | null
  defaultCourierId?: string | null
  assignedSetId?: string | null
  password?: string
}

// ── Update Customer input ────────────────────────────────────────────────────

export interface UpdateCustomerData {
  name?: string
  nickName?: string
  phone?: string
  address?: string
  calories?: number | string
  planType?: string
  dailyPrice?: number | string
  notes?: string
  specialFeatures?: string
  deliveryDays?: DeliveryDays
  autoOrdersEnabled?: boolean
  isActive?: boolean
  latitude?: number | string | null
  longitude?: number | string | null
  defaultCourierId?: string | null
  assignedSetId?: string | null
  password?: string
}
