/**
 * Admins DTOs — Data Transfer Objects for the Admin management module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 */

// ── Admin (current user / list / detail views) ───────────────────────────────

export interface AdminDTO {
  id: string
  name: string
  email: string
  role: AdminRoleString
  isActive: boolean
  createdBy: string | null
  allowedTabs: string[] | null
}

export interface AdminListItem {
  id: string
  name: string
  email: string
  role: AdminRoleString
  isActive: boolean
  createdBy: string | null
  allowedTabs: string[] | null
  createdAt: string
  salary: number
  creatorName: string | null
}

export interface AdminDetail {
  id: string
  name: string
  email: string
  role: AdminRoleString
  isActive: boolean
  createdBy: string | null
  allowedTabs: string[] | null
  createdAt: string
  salary: number
  hasPassword: boolean
}

export type AdminRoleString = 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'WORKER'

// ── Create / Update admin ────────────────────────────────────────────────────

export interface CreateAdminData {
  email: string
  password?: string
  name: string
  role: 'LOW_ADMIN' | 'COURIER' | 'WORKER'
  allowedTabs?: string[]
  salary?: number
}

export interface CreateMiddleAdminData {
  email: string
  password: string
  name: string
}

export interface UpdateAdminData {
  name?: string
  email?: string
  role?: AdminRoleString
  isActive?: boolean
  allowedTabs?: string[] | null
  salary?: number
  password?: string
}

export interface UpdateMiddleAdminData {
  name?: string
  email?: string
}

export interface UpdateProfileData {
  name: string
  email: string
  password?: string
}

// ── Change / Reset password ──────────────────────────────────────────────────

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordResult {
  password: string
}

// ── Toggle status ────────────────────────────────────────────────────────────

export interface ToggleStatusResult {
  id: string
  isActive: boolean
  name: string
  role: AdminRoleString
}

// ── Delete admin ─────────────────────────────────────────────────────────────

export interface DeleteAdminResult {
  success: boolean
  message?: string
}

// ── Users list (for action-logs filter) ──────────────────────────────────────

export interface UsersListItem {
  id: string
  name: string
  role: AdminRoleString
}

// ── Action log ───────────────────────────────────────────────────────────────

export interface ActionLogDTO {
  id: string
  adminId: string
  action: string
  entityType: string | null
  entityId: string | null
  oldValues: string | null
  newValues: string | null
  description: string | null
  createdAt: string
  admin: {
    name: string
    email: string
    role: AdminRoleString
  } | null
}

export interface ActionLogListResult {
  logs: ActionLogDTO[]
  total: number
  hasMore: boolean
}

// ── Feature ──────────────────────────────────────────────────────────────────

export interface FeatureDTO {
  id: string
  ownerAdminId: string
  name: string
  description: string
  type: 'TEXT' | 'SELECT'
  options: string[] | null
  createdAt: string
}

export interface CreateFeatureData {
  name: string
  description: string
  type: 'TEXT' | 'SELECT'
  options?: string
}

// ── Menu Set ─────────────────────────────────────────────────────────────────

export interface MenuSetDTO {
  id: string
  name: string
  description: string | null
  menuNumber: number
  calorieGroups: unknown
  isActive: boolean
  adminId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateMenuSetData {
  name: string
  description?: string
}

export interface UpdateMenuSetData {
  name?: string
  description?: string
  calorieGroups?: unknown
  isActive?: boolean
}

// ── Live map ─────────────────────────────────────────────────────────────────

export interface LiveMapPoint {
  id: string
  name: string
  lat: number
  lng: number
}

export interface LiveOrderPoint {
  id: string
  orderNumber: number
  customerName: string
  status: string
  deliveryTime: string
  courierId: string | null
  courierName: string | null
  lat: number
  lng: number
}

export type LiveWarehousePoint = {
  lat: number
  lng: number
} | null

export interface LiveMapData {
  serverTime: string
  couriers: LiveMapPoint[]
  clients: LiveMapPoint[]
  orders: LiveOrderPoint[]
  warehouse: LiveWarehousePoint
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export interface StartDayResult {
  message: string
  updatedCount: number
}

export interface NormalizeDraftsResult {
  message: string
  updatedCount: number
}

// ── Route optimization ───────────────────────────────────────────────────────

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteStop {
  orderId: string
  lat: number
  lng: number
}

export interface RouteInput {
  containerId: string
  startPoint?: LatLng | null
  stops: RouteStop[]
}

export interface RouteOutput {
  containerId: string
  orderedOrderIds: string[]
  polyline: LatLng[]
  durationSec: number | null
  source: 'ors' | 'fallback' | 'none'
}

export interface OrsOptimizeResult {
  routes: RouteOutput[]
  provider: string
}

// ── Auto orders ──────────────────────────────────────────────────────────────

export interface AutoOrderCreateResult {
  message: string
  startDate: string
  createdCount: number
  failedCount: number
  sampleOrders: Array<{ id: string; customerName: string | null; date: string }>
}

export interface AutoOrderScheduleResult {
  message: string
  period: { start: string; end: string }
  totalClients: number
  totalOrdersCreated: number
  isCronRequest: boolean
}

// ── Database snapshot ────────────────────────────────────────────────────────

export interface SnapshotTable {
  id: string
  title: string
  description: string
  rowCount: number
  columns: string[]
  rows: Record<string, string>[]
}

export interface DatabaseSnapshotResult {
  ok: boolean
  generatedAt: string
  scope: string
  tables: SnapshotTable[]
  summary: Array<{
    id: string
    title: string
    description: string
    rowCount: number
    columnCount: number
  }>
}

// ── Expand URL ───────────────────────────────────────────────────────────────

export interface ExpandUrlResult {
  expandedUrl: string
}

// ── Scheduler ────────────────────────────────────────────────────────────────

export interface SchedulerRunResult {
  success: boolean
  message: string
  ordersCreated: number
  timestamp: string
}

export interface SchedulerStatus {
  status: string
  timestamp: string
  stats: {
    totalClients: number
    activeClients: number
    totalOrders: number
    autoOrders: number
    manualOrders: number
  }
}
