/**
 * Courier DTOs — Data Transfer Objects for the Courier module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 */

// ── Courier Profile ───────────────────────────────────────────────────────

export interface CourierProfileDTO {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  salary: number
  salaryPerDay: number
  salaryAccrued: number
  salaryPaid: number
  balance: number
  createdAt: string
}

// ── Courier Order (lightweight, for list views) ───────────────────────────

export interface CourierOrderCustomerDTO {
  name: string
  phone: string
  address?: string
  latitude?: number | null
  longitude?: number | null
}

export interface CourierOrderDTO {
  id: string
  orderNumber: number
  orderStatus: string
  customerId: string
  deliveryAddress: string
  deliveryTime: string | null
  deliveryDate: string | null
  latitude: number | null
  longitude: number | null
  quantity: number
  calories: number
  specialFeatures: string | null
  notes: string | null
  paymentStatus: string
  paymentMethod: string
  isPrepaid: boolean
  courierId: string | null
  customer: CourierOrderCustomerDTO
  createdAt: string
  updatedAt: string
}

// ── Next Order (extended with customer display fields) ────────────────────

export interface NextOrderDTO extends CourierOrderDTO {
  customerName: string
  customerPhone: string
  isAutoOrder: boolean
}

// ── Courier Stats ─────────────────────────────────────────────────────────

export interface CourierStatsDTO {
  totalDelivered: number
  todayDelivered: number
}

// ── Courier Route (today's route orders) ──────────────────────────────────

export type CourierRouteDTO = CourierOrderDTO[]

// ── Location Update ───────────────────────────────────────────────────────

export interface LocationUpdateData {
  latitude: number
  longitude: number
}

// ── Profile Update ────────────────────────────────────────────────────────

export interface ProfileUpdateData {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

// ── Complete / Fail Order ─────────────────────────────────────────────────

export interface CompleteOrderResult {
  id: string
  orderStatus: string
  deliveredAt: string | null
}

export interface FailOrderData {
  reason?: string
}

export interface FailOrderResult {
  id: string
  orderStatus: string
}

// ── Withdraw ──────────────────────────────────────────────────────────────

export interface WithdrawData {
  amount: number
}

export interface WithdrawResult {
  success: boolean
  transactionId: string
  withdrawn: number
  balance: number
}

// ── Admin Courier Management ──────────────────────────────────────────────

export interface AdminCourierDTO {
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

export interface AdminCourierPatchData {
  courierId: string
  name?: string
  latitude?: number | null
  longitude?: number | null
  salary?: number
}

export interface AdminCourierCreateData {
  name: string
  email: string
  password: string
  salary?: number | string
}
