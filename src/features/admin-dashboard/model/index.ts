/**
 * Barrel exports for the admin-dashboard model layer.
 *
 * Import from `@/features/admin-dashboard/model`.
 */

export type {
  AdminDashboardMode,
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
} from './admin-dashboard.types'

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
} from './admin-dashboard.types'

export {
  DASHBOARD_UI_STORAGE_PREFIX,
  DEFAULT_ORDER_FILTERS as DEFAULT_ORDER_FILTERS_CONST,
} from './admin-dashboard.constants'

export {
  toLocalIsoDate,
  parseLocalIsoDate,
  getDateLocale,
  getClientGroupOptions,
  type GroupOption,
} from './admin-dashboard.helpers'

export {
  useAdminDashboardTab,
  type UseAdminDashboardTabOptions,
  type UseAdminDashboardTabReturn,
} from './useAdminDashboardTab'
