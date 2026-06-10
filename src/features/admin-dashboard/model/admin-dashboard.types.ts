/**
 * Admin dashboard — shared types & form-data defaults.
 *
 * Re-exports useful types from the legacy dashboard/types module and
 * defines the AdminDashboardMode discriminated union used by the page.
 */

// ---------------------------------------------------------------------------
// Re-exports from @/components/admin/dashboard/types
// ---------------------------------------------------------------------------
export type {
  Admin,
  Client,
  Order,
  Stats,
  AdminRoleOption,
  AdminFormData,
  EditAdminFormData,
  DeliveryDays,
  OrderFormData,
  ClientFormData,
  CourierFormData,
  BulkOrderUpdates,
  BulkClientUpdates,
  OrderFilters,
  OrderTimelineEvent,
  ClientFinanceEntry,
  ClientFinanceById,
} from '@/components/admin/dashboard/types'

export {
  DEFAULT_ADMIN_FORM,
  DEFAULT_EDIT_ADMIN_FORM,
  DEFAULT_DELIVERY_DAYS,
  DEFAULT_COURIER_FORM,
  DEFAULT_CLIENT_FORM,
  DEFAULT_ORDER_FORM,
  DEFAULT_BULK_ORDER_UPDATES,
  DEFAULT_BULK_CLIENT_UPDATES,
  DEFAULT_ORDER_FILTERS,
} from '@/components/admin/dashboard/types'

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Discriminator for the two admin dashboard views. */
export type AdminDashboardMode = 'middle' | 'low'
