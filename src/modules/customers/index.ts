/**
 * Customers module — Clean Architecture.
 *
 * This module encapsulates all customer-related business logic following
 * a layered architecture:
 *
 * - `domain/`       — Domain entities, policies, errors, and events
 * - `contracts/`    — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Domain
export {
  CustomerEntity,
  CustomerPolicy,
  type CustomerPolicyUser,
  type CustomerPolicyCustomer,
  CustomerHasActiveOrdersError,
  CustomerNotInGroupError,
  CustomerValidationError,
  type CustomerCreatedEvent,
  type CustomerStatusToggledEvent,
  type CustomerDeletedEvent,
  createCustomerCreatedEvent,
  createCustomerStatusToggledEvent,
  createCustomerDeletedEvent,
} from './domain'

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
  executeBatchGetCustomers,
  type ListCustomersQuery,
  type GetCustomerDetailQuery,
  type BatchGetCustomersQuery,
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
  batchGetCustomers,
  resolveScopedCustomerIds,
  type ListCustomersInput,
  type GetCustomerDetailInput,
  type ListBinCustomersInput,
  type GetCustomerSummaryInput,
  type BatchGetCustomersInput,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from './infrastructure'
