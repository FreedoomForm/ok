# Module: orders

Domain: Order management for delivery operations.

## Public API

- `CreateOrderCommand` / `CreateOrderHandler`
- `UpdateOrderStatusCommand` / `UpdateOrderStatusHandler`
- `GetOrderDetailQuery` / `GetOrderDetailHandler`
- `ListOrdersQuery` / `ListOrdersHandler`
- `OrderSummary`, `OrderListItem`, `OrderDetail` DTOs

## Dependencies

- `customers` (for client validation)
- `warehouse` (for stock reservation — optional)
- `billing` (for payment tracking)
- `auth` (for permission checks)

## Data Priority

| Priority | Data | Storage |
|---|---|---|
| D0 | Order core (id, status, customerId, adminId) | Primary DB |
| D1 | Order list items, customer summary | Read model / cache |
| D2 | Audit events, full history | Separate table, lazy |
| D3 | Analytics, export, old archive | Async job / OLAP |
