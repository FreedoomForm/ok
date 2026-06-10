# Admins Module

Admin management and platform operations for the AutoFood delivery platform.

## Purpose

Handles admin CRUD (super/middle/low admin + courier), role-based access control, password management, action audit logs, feature flags, menu sets, live map data, dispatch operations, route optimization, auto-order scheduling, database snapshots, and system scheduler.

## Directory Structure

```
src/modules/admins/
├── contracts/
│   ├── admins.dto.ts       # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── admins.repository.ts # Prisma queries with select presets
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── get-current-admin.ts  # Get authenticated admin
│   │   ├── list-admins.ts        # List admins by role
│   │   ├── get-admin-detail.ts   # Get single admin detail
│   │   ├── list-users.ts         # List users for action-log filter
│   │   └── index.ts
│   ├── commands/
│   │   ├── create-admin.ts         # Create LOW_ADMIN/COURIER/WORKER
│   │   ├── update-admin.ts         # Update admin details
│   │   ├── create-middle-admin.ts  # SUPER_ADMIN: create MIDDLE_ADMIN
│   │   ├── update-middle-admin.ts  # SUPER_ADMIN: update MIDDLE_ADMIN
│   │   ├── delete-admin.ts         # Delete admin with audit
│   │   ├── toggle-admin-status.ts  # Activate/deactivate admin
│   │   ├── change-password.ts      # Change own password
│   │   ├── reset-password.ts       # Reset admin password
│   │   ├── update-profile.ts       # Update own profile
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeGetCurrentAdmin(query)` | Get current authenticated admin |
| `executeListAdmins(query)` | List admins (low-admins, middle-admins) |
| `executeGetAdminDetail(query)` | Get single admin detail |
| `executeListUsers(query)` | List users for action-log filter |

### Commands
| Function | Description |
|---|---|
| `executeCreateAdmin(command)` | Create LOW_ADMIN/COURIER/WORKER |
| `executeUpdateAdmin(command)` | Update admin details |
| `executeCreateMiddleAdmin(command)` | SUPER_ADMIN: create MIDDLE_ADMIN |
| `executeUpdateMiddleAdmin(command)` | SUPER_ADMIN: update MIDDLE_ADMIN |
| `executeDeleteAdmin(command)` | Delete admin with audit log |
| `executeToggleAdminStatus(command)` | Activate/deactivate admin |
| `executeChangePassword(command)` | Change own password (requires current) |
| `executeResetPassword(command)` | Reset admin password (generates new) |
| `executeUpdateProfile(command)` | Update own profile (name/email/password) |

### Infrastructure
| Function | Description |
|---|---|
| `findCurrentAdmin()` | Raw current admin query |
| `listLowAdmins()` | Raw low-admin list |
| `listMiddleAdmins()` | Raw middle-admin list |
| `findAdminDetail()` | Raw admin detail |
| `findAdminForOwnership()` | Verify admin ownership |
| `findAdminWithPassword()` | Find admin with password hash |
| `isEmailTaken()` | Email uniqueness check |
| `listUsersForLogs()` | Raw users list for log filter |
| `listActionLogs()` | Raw action logs |
| `listFeatures()` | Raw feature flags |
| `findFeatureForOwner()` | Verify feature ownership |
| `createFeature()` | Raw feature create |
| `deleteFeature()` | Raw feature delete |
| `listMenuSets()` | Raw menu sets |
| `findMenuSet()` | Raw menu set query |
| `createMenuSet()` | Raw menu set create |
| `updateMenuSet()` | Raw menu set update |
| `deactivateOtherMenuSets()` | Deactivate other sets when one activates |
| `deleteMenuSet()` | Raw menu set delete |
| `createLowAdmin()` | Raw low-admin create |
| `createMiddleAdmin()` | Raw middle-admin create |
| `updateLowAdmin()` | Raw low-admin update |
| `updateMiddleAdmin()` | Raw middle-admin update |
| `updateAdminProfile()` | Raw profile update |
| `updateAdminPassword()` | Raw password update |
| `toggleAdminStatus()` | Raw status toggle |
| `deleteAdmin()` | Raw admin delete |
| `logAction()` | Create action log entry |

## Key DTOs

| DTO | Purpose |
|---|---|
| `AdminDTO` | Basic admin info |
| `AdminListItem` | Admin row for list views (includes salary, creator) |
| `AdminDetail` | Full admin detail (includes hasPassword) |
| `AdminRoleString` | `'SUPER_ADMIN' \| 'MIDDLE_ADMIN' \| 'LOW_ADMIN' \| 'COURIER' \| 'WORKER'` |
| `CreateAdminData` | Input for creating admin |
| `CreateMiddleAdminData` | Input for creating middle admin |
| `UpdateAdminData` | Input for updating admin |
| `UpdateMiddleAdminData` | Input for updating middle admin |
| `ChangePasswordData` | Input for password change |
| `ResetPasswordResult` | Result of password reset |
| `ActionLogDTO` | Audit log entry |
| `ActionLogListResult` | Paginated audit log result |
| `FeatureDTO` | Feature flag |
| `MenuSetDTO` | Menu set configuration |
| `LiveMapData` | Live map data (couriers, clients, orders, warehouse) |
| `OrsOptimizeResult` | Route optimization result |
| `AutoOrderScheduleResult` | Auto-order scheduling result |
| `DatabaseSnapshotResult` | Database snapshot for debug |
| `SchedulerRunResult` | Scheduler execution result |

## Role-Based Scoping Rules

| Role | Can Create | Can Update | Can Delete | Scope |
|---|---|---|---|---|
| `SUPER_ADMIN` | MIDDLE_ADMIN, LOW_ADMIN, COURIER, WORKER | All admins | All admins | Platform-wide |
| `MIDDLE_ADMIN` | LOW_ADMIN, COURIER, WORKER | Own subordinates | Own subordinates | Own admin group |
| `LOW_ADMIN` | None | Own profile only | None | Own data only |
| `COURIER` | None | Own profile only | None | Own data only |
