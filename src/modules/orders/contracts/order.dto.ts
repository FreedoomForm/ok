/**
 * Order DTOs — Data Transfer Objects for the Orders module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 *
 * Convention:
 * - `ListItem` — lightweight row for list/table views
 * - `Detail`   — full object for detail views
 * - `Timeline` — audit event entries
 * - `Stats`    — aggregated statistics
 */

// ── Enums (mirror Prisma enums without importing @prisma/client) ────────────

export type OrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'IN_PROCESS'
  | 'IN_DELIVERY'
  | 'PAUSED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'FAILED'

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
export type OrderType = 'MORNING' | 'EVENING'
export type OrderEventType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'DETAILS_UPDATED'
  | 'COURIER_ASSIGNED'
  | 'COURIER_UNASSIGNED'
  | 'DELIVERY_STARTED'
  | 'DELIVERY_PAUSED'
  | 'DELIVERY_RESUMED'
  | 'DELIVERY_COMPLETED'
  | 'PAYMENT_UPDATED'
  | 'REORDERED'

// ── Embedded objects ─────────────────────────────────────────────────────────

export interface OrderCustomerSnapshot {
  name: string
  phone: string
  assignedSetId: string | null
  assignedSetName: string | null
}

// ── List Item (lightweight, for table/list views) ────────────────────────────

export interface OrderListItem {
  id: string
  orderNumber: number
  orderStatus: OrderStatus
  customerId: string
  customerName: string
  customerPhone: string
  assignedSetId: string | null
  assignedSetName: string | null
  customer: OrderCustomerSnapshot
  deliveryDate: string          // ISO date string (YYYY-MM-DD)
  deliveryAddress: string | null
  deliveryTime: string | null
  quantity: number
  calories: number
  specialFeatures: string | null
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  isPrepaid: boolean
  amountReceived: number | null
  courierId: string | null
  courierName: string | null
  isAutoOrder: boolean
  orderType: OrderType | null
  priority: number
  sourceChannel: string | null
  latitude: number | null
  longitude: number | null
  deletedAt: string | null
  createdAt: string
}

// ── Detail (full object, for detail/edit views) ──────────────────────────────

export interface OrderDetail extends OrderListItem {
  adminId: string | null
  etaMinutes: number | null
  routeDistanceKm: number | null
  routeDurationMin: number | null
  sequenceInRoute: number | null
  customerRating: number | null
  customerFeedback: string | null
  lastLatitude: number | null
  lastLongitude: number | null
  lastLocationAt: string | null
  statusChangedAt: string | null
  assignedAt: string | null
  pickedUpAt: string | null
  pausedAt: string | null
  resumedAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  canceledAt: string | null
  confirmedAt: string | null
  updatedAt: string
}

// ── Timeline Event ───────────────────────────────────────────────────────────

export interface OrderTimelineEvent {
  id: string
  eventType: OrderEventType
  occurredAt: string
  actorRole: string | null
  actorName: string
  previousStatus: string | null
  nextStatus: string | null
  message: string | null
  payload: unknown
}

// ── Customer Order Tracking (customer-facing, minimal + live courier) ─────────

/**
 * Order view returned to an authenticated CUSTOMER tracking their own order.
 * Intentionally minimal: no admin/audit fields, only what the customer needs
 * plus the assigned courier's live coordinates for map tracking.
 */
export interface CustomerOrderTracking {
  id: string
  orderNumber: number
  orderStatus: OrderStatus
  deliveryDate: string
  deliveryAddress: string | null
  deliveryTime: string | null
  quantity: number
  calories: number
  paymentStatus: PaymentStatus
  etaMinutes: number | null
  courier: {
    name: string
    phone: string
    latitude: number | null
    longitude: number | null
  } | null
}


// ── Order Stats ──────────────────────────────────────────────────────────────

export interface OrderStats {
  successfulOrders: number
  failedOrders: number
  pendingOrders: number
  inDeliveryOrders: number
  pausedOrders: number
  prepaidOrders: number
  unpaidOrders: number
  cardOrders: number
  cashOrders: number
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
  specialPreferenceCustomers: number
  orders1200: number
  orders1600: number
  orders2000: number
  orders2500: number
  orders3000: number
  singleItemOrders: number
  multiItemOrders: number
}

// ── Filter input for list queries ────────────────────────────────────────────

export interface OrderListFilters {
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
