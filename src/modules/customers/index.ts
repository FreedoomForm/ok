/**
 * Customers module — Clean Architecture.
 *
 * This module encapsulates all customer-related business logic following
 * a layered architecture:
 *
 * - `contracts/`   — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Contracts (DTOs)
export type {
  PlanType,
  DeliveryDays,
  CustomerListItem,
  CustomerDetail,
  CustomerBinItem,
  CustomerSummary,
  BatchResult,
  SoftDeleteResult,
  PermanentDeleteResult,
  CreateCustomerData,
  UpdateCustomerData,
} from './contracts'

// Application queries
export {
  executeListCustomers,
  executeGetCustomerDetail,
  type ListCustomersQuery,
  type GetCustomerDetailQuery,
} from './application/queries'

// Application commands
export {
  executeCreateCustomer,
  executeUpdateCustomer,
  executeToggleCustomerStatus,
  executeSoftDeleteCustomers,
  executeRestoreCustomers,
  executePermanentDeleteCustomers,
  executeBulkUpdateCustomers,
  type CreateCustomerCommand,
  type UpdateCustomerCommand,
  type ToggleCustomerStatusCommand,
  type SoftDeleteCustomersCommand,
  type RestoreCustomersCommand,
  type PermanentDeleteCustomersCommand,
  type BulkUpdateCustomersCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listCustomers,
  getCustomerDetail,
  listBinCustomers,
  getCustomerSummary,
  createCustomer,
  updateCustomer,
  resolveScopedCustomerIds,
  type ListCustomersInput,
  type GetCustomerDetailInput,
  type ListBinCustomersInput,
  type GetCustomerSummaryInput,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from './infrastructure'
