# Customers Module

Customer (client) management for the AutoFood delivery platform.

## Purpose

Handles customer CRUD, status toggling, soft-delete with recycle bin, bulk updates, and summary statistics. Includes N+1 fix via batch loading for related courier and menu-set data.

## Directory Structure

```
src/modules/customers/
├── contracts/
│   ├── customer.dto.ts     # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── customer.repository.ts # Prisma queries with select presets + batch loading
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── list-customers.ts       # List customers with role-based scoping
│   │   ├── get-customer-detail.ts  # Single customer detail
│   │   └── index.ts
│   ├── commands/
│   │   ├── create-customer.ts        # Create new customer
│   │   ├── update-customer.ts        # Update customer data
│   │   ├── toggle-customer-status.ts # Activate/deactivate
│   │   ├── delete-customer.ts        # Soft delete (moves to bin)
│   │   ├── bulk-update-customers.ts  # Bulk update with auto-order sync
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeListCustomers(query)` | List customers with role-based scoping |
| `executeGetCustomerDetail(query)` | Get full customer detail |

### Commands
| Function | Description |
|---|---|
| `executeCreateCustomer(command)` | Create a new customer with optional auto-order |
| `executeUpdateCustomer(command)` | Update customer data |
| `executeToggleCustomerStatus(command)` | Activate or deactivate a customer |
| `executeSoftDeleteCustomers(command)` | Soft-delete customers (to recycle bin) |
| `executeRestoreCustomers(command)` | Restore soft-deleted customers |
| `executePermanentDeleteCustomers(command)` | Permanently delete customers and their orders |
| `executeBulkUpdateCustomers(command)` | Bulk update with auto-order synchronization |

### Infrastructure
| Function | Description |
|---|---|
| `listCustomers(input)` | Raw list with Prisma select preset + batch loading |
| `getCustomerDetail(input)` | Raw detail query |
| `listBinCustomers(input)` | List soft-deleted customers |
| `getCustomerSummary(input)` | Active/inactive/auto-order counts |
| `createCustomer(input)` | Raw Prisma create |
| `updateCustomer(input)` | Raw Prisma update |
| `resolveScopedCustomerIds(input)` | Resolve customer IDs visible to a given admin role |

## Key DTOs

| DTO | Purpose |
|---|---|
| `CustomerListItem` | Lightweight row for table views |
| `CustomerDetail` | Full customer object for detail/edit |
| `CustomerBinItem` | Minimal info for recycle bin |
| `CustomerSummary` | Count-based stats (total, active, with auto-orders) |
| `CreateCustomerData` | Input for creating a customer |
| `UpdateCustomerData` | Input for updating a customer |
| `BatchResult` | Generic batch operation result |
| `SoftDeleteResult` | Soft-delete result with deleted auto-order count |
| `PermanentDeleteResult` | Permanent delete result with client + order counts |
| `PlanType` | `'CLASSIC' \| 'INDIVIDUAL' \| 'DIABETIC'` |

## Role-Based Scoping Rules

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | All customers |
| `MIDDLE_ADMIN` | Customers belonging to self + subordinate admin group |
| `LOW_ADMIN` | Customers within own admin group |
| `COURIER` | No direct customer access (only via assigned orders) |
