# Orders Module

Order management — the core business domain of AutoFood delivery platform.

## Purpose

Handles the full lifecycle of food delivery orders: creation, status transitions, courier assignment, delivery tracking, archival, and statistics. This is the most data-intensive module and the first to be migrated to Clean Architecture.

## Directory Structure

```
src/modules/orders/
├── contracts/
│   ├── order.dto.ts        # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── order.repository.ts # Prisma queries with select presets + transformers
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── list-orders.ts       # List orders with role-based scoping + filters
│   │   ├── get-order-detail.ts  # Single order with access control
│   │   ├── get-order-stats.ts   # Aggregated statistics
│   │   ├── get-order-timeline.ts # Audit timeline for an order
│   │   └── index.ts
│   ├── commands/
│   │   ├── create-order.ts            # Create new order
│   │   ├── update-order-status.ts     # Status transitions + audit events
│   │   ├── archive-order.ts           # Soft delete, restore, permanent delete
│   │   ├── reorder-orders.ts          # Reorder with priority update
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeListOrders(query)` | List orders with filters, date range, and role-based scoping |
| `executeGetOrderDetail(query)` | Get full order detail with access control |
| `executeGetOrderStats(query)` | Get aggregated order statistics |
| `executeGetOrderTimeline(query)` | Get audit timeline events for an order |

### Commands
| Function | Description |
|---|---|
| `executeCreateOrder(command)` | Create a new order |
| `executeUpdateOrderStatus(command)` | Update order status with audit logging |
| `executeSoftDeleteOrders(command)` | Soft-delete orders (mark as deleted) |
| `executeRestoreOrders(command)` | Restore soft-deleted orders |
| `executePermanentDeleteOrders(command)` | Permanently delete orders from database |
| `executeBulkUpdateOrders(command)` | Bulk update multiple orders |
| `executeReorderOrders(command)` | Reorder with priority changes |

### Infrastructure (for advanced usage/testing)
| Function | Description |
|---|---|
| `listOrders(input)` | Raw list with Prisma select preset |
| `getOrderDetail(input)` | Raw detail with Prisma select preset |
| `getOrderTimeline(input)` | Raw timeline query |
| `getOrderStats(input)` | Raw stats aggregation |
| `createOrder(input)` | Raw Prisma create |
| `updateOrder(input)` | Raw Prisma update |

## Key DTOs

| DTO | Purpose |
|---|---|
| `OrderListItem` | Lightweight row for table/list views |
| `OrderDetail` | Full order object for detail/edit views |
| `OrderTimelineEvent` | Audit event entry for order history |
| `OrderStats` | Aggregated statistics (counts by status, payment, calories) |
| `OrderListFilters` | Filter input for list queries |
| `OrderStatus` | `'NEW' \| 'PENDING' \| 'IN_PROCESS' \| 'IN_DELIVERY' \| 'PAUSED' \| 'DELIVERED' \| 'CANCELED' \| 'FAILED'` |
| `PaymentStatus` | `'PAID' \| 'UNPAID' \| 'PARTIAL'` |
| `PaymentMethod` | `'CASH' \| 'CARD' \| 'TRANSFER'` |
| `OrderType` | `'MORNING' \| 'EVENING'` |

## Role-Based Scoping Rules

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | All orders across the platform |
| `MIDDLE_ADMIN` | Orders belonging to self + subordinate LOW_ADMINs + COURIERs |
| `LOW_ADMIN` | Orders within own admin group |
| `COURIER` | Only orders assigned to this courier |
| `WORKER` | No order access |
