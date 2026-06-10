# Courier Module

Courier management for the AutoFood delivery platform.

## Purpose

Handles courier profile, order assignment, delivery tracking (location updates), delivery stats, route planning, salary withdrawal, and admin courier management (CRUD). Includes order completion/failure with audit event logging.

## Directory Structure

```
src/modules/courier/
├── contracts/
│   ├── courier.dto.ts      # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── courier.repository.ts # Prisma queries with select presets + transformers
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── get-courier-profile.ts   # Get courier profile with salary info
│   │   ├── list-courier-orders.ts   # List assigned orders
│   │   ├── get-next-order.ts        # Get next pending order
│   │   ├── get-courier-stats.ts     # Delivery statistics
│   │   ├── get-courier-route.ts     # Today's route orders
│   │   ├── list-admin-couriers.ts   # Admin: list all couriers
│   │   └── index.ts
│   ├── commands/
│   │   ├── update-location.ts       # Update courier GPS location
│   │   ├── update-profile.ts        # Update profile/password
│   │   ├── complete-order.ts        # Mark order as delivered
│   │   ├── fail-order.ts            # Mark order as failed
│   │   ├── request-withdraw.ts      # Withdraw salary
│   │   ├── admin-update-courier.ts  # Admin: update courier details
│   │   ├── admin-create-courier.ts  # Admin: create courier account
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeGetCourierProfile(query)` | Get courier profile with salary/balance info |
| `executeListCourierOrders(query)` | List orders assigned to courier (with date filter) |
| `executeGetNextOrder(query)` | Get the next pending order for delivery |
| `executeGetCourierStats(query)` | Get delivery stats (total + today delivered) |
| `executeGetCourierRoute(query)` | Get today's route orders |
| `executeListAdminCouriers(query)` | Admin: list all couriers in scope |

### Commands
| Function | Description |
|---|---|
| `executeUpdateLocation(command)` | Update courier GPS coordinates |
| `executeUpdateProfile(command)` | Update name/email with optional password change |
| `executeCompleteOrder(command)` | Mark order as DELIVERED with audit event |
| `executeFailOrder(command)` | Mark order as FAILED with audit event |
| `executeRequestWithdraw(command)` | Withdraw salary with balance validation |
| `executeAdminUpdateCourier(command)` | Admin: update courier name/location/salary |
| `executeAdminCreateCourier(command)` | Admin: create new courier account |

### Infrastructure
| Function | Description |
|---|---|
| `findCourierProfile()` | Raw profile query |
| `listCourierOrders()` | Raw order list |
| `findNextOrder()` | Raw next order query |
| `getCourierStats()` | Raw stats aggregation |
| `getCourierRoute()` | Raw route query |
| `findOrderForCourier()` | Verify order belongs to courier |
| `findCourierForWithdraw()` | Get courier balance for withdrawal |
| `calculateAvailableBalance()` | Compute withdrawable balance |
| `findPayerAdmin()` | Find admin responsible for payment |
| `processWithdraw()` | Execute withdrawal transaction |
| `updateCourierLocation()` | Raw location update |
| `updateCourierProfile()` | Raw profile update |
| `updateCourierPassword()` | Raw password update with bcrypt |
| `completeOrder()` | Raw order completion |
| `failOrder()` | Raw order failure |
| `logOrderEvent()` | Create order audit event |
| `logAction()` | Create admin action log |
| `listCouriersForAdmin()` | Raw admin courier list |
| `findCourierForAdminUpdate()` | Verify courier for admin update |
| `adminUpdateCourier()` | Raw admin update |
| `createCourierAccount()` | Raw courier creation |
| `isCourierEmailTaken()` | Email uniqueness check |

## Key DTOs

| DTO | Purpose |
|---|---|
| `CourierProfileDTO` | Courier profile with salary info |
| `CourierOrderDTO` | Order assigned to courier |
| `NextOrderDTO` | Next order with extended customer info |
| `CourierStatsDTO` | Delivery statistics |
| `CourierRouteDTO` | Today's route (array of orders) |
| `LocationUpdateData` | GPS coordinates update |
| `ProfileUpdateData` | Profile + optional password update |
| `CompleteOrderResult` | Order completion result |
| `FailOrderResult` | Order failure result |
| `WithdrawData` / `WithdrawResult` | Salary withdrawal |
| `AdminCourierDTO` | Admin view of courier |
| `AdminCourierCreateData` | Input for creating courier |
| `AdminCourierPatchData` | Input for updating courier |

## Role-Based Scoping Rules

| Role | Scope |
|---|---|
| `COURIER` | Own profile, own orders, own stats, own route |
| `SUPER_ADMIN` | All couriers, full CRUD |
| `MIDDLE_ADMIN` | Couriers in own admin group |
| `LOW_ADMIN` | Read-only access to couriers in own group |
