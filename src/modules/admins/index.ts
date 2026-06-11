/**
 * Admins module — Clean Architecture.
 *
 * This module encapsulates all admin management business logic following
 * a layered architecture:
 *
 * - `domain/`         — Domain entities, policies, errors, and events
 * - `contracts/`      — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`    — Use-case queries/commands with auth & scope logic
 */

// Domain
export {
  AdminEntity,
  AdminPolicy,
  type AdminPolicyUser,
  type AdminPolicyTarget,
  CannotCreateSubordinateError,
  CannotDeleteAdminError,
  CannotToggleOwnStatusError,
  type AdminCreatedEvent,
  type AdminDeletedEvent,
  type AdminStatusToggledEvent,
  createAdminCreatedEvent,
  createAdminDeletedEvent,
  createAdminStatusToggledEvent,
} from './domain'

// Contracts (DTOs)
export type {
  AdminDTO,
  AdminListItem,
  AdminDetail,
  AdminRoleString,
  CreateAdminData,
  CreateMiddleAdminData,
  UpdateAdminData,
  UpdateMiddleAdminData,
  UpdateProfileData,
  ChangePasswordData,
  ResetPasswordResult,
  ToggleStatusResult,
  DeleteAdminResult,
  UsersListItem,
  ActionLogDTO,
  ActionLogListResult,
  FeatureDTO,
  CreateFeatureData,
  MenuSetDTO,
  CreateMenuSetData,
  UpdateMenuSetData,
  LiveMapPoint,
  LiveOrderPoint,
  LiveWarehousePoint,
  LiveMapData,
  StartDayResult,
  NormalizeDraftsResult,
  LatLng,
  RouteStop,
  RouteInput,
  RouteOutput,
  OrsOptimizeResult,
  AutoOrderCreateResult,
  AutoOrderScheduleResult,
  SnapshotTable,
  DatabaseSnapshotResult,
  ExpandUrlResult,
  SchedulerRunResult,
  SchedulerStatus,
} from './contracts'

// Application queries
export {
  executeGetCurrentAdmin,
  executeListAdmins,
  executeGetAdminDetail,
  executeListUsers,
  executeBatchGetAdmins,
  executeListMenuSets,
  type GetCurrentUserQuery,
  type ListAdminsQuery,
  type GetAdminDetailQuery,
  type ListUsersQuery,
  type BatchGetAdminsQuery,
  type ListMenuSetsQuery,
} from './application/queries'

// Application commands
export {
  executeCreateAdmin,
  executeUpdateAdmin,
  executeCreateMiddleAdmin,
  executeUpdateMiddleAdmin,
  executeDeleteAdmin,
  executeToggleAdminStatus,
  executeChangePassword,
  executeResetPassword,
  executeUpdateProfile,
  executeCreateMenuSet,
  type CreateAdminCommand,
  type UpdateAdminCommand,
  type CreateMiddleAdminCommand,
  type UpdateMiddleAdminCommand,
  type DeleteAdminCommand,
  type ToggleAdminStatusCommand,
  type ChangePasswordCommand,
  type ResetPasswordCommand,
  type UpdateProfileCommand,
  type CreateMenuSetCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  findCurrentAdmin,
  listLowAdmins,
  listMiddleAdmins,
  findAdminDetail,
  findAdminForOwnership,
  findAdminWithPassword,
  isEmailTaken,
  listUsersForLogs,
  listActionLogs,
  listFeatures,
  findFeatureForOwner,
  createFeature,
  deleteFeature,
  listMenuSets,
  findMenuSet,
  createMenuSet,
  updateMenuSet,
  deactivateOtherMenuSets,
  deleteMenuSet,
  batchGetAdmins,
  createLowAdmin,
  createMiddleAdmin,
  updateLowAdmin,
  updateMiddleAdmin,
  updateAdminProfile,
  updateAdminPassword,
  toggleAdminStatus,
  deleteAdmin,
  logAction,
} from './infrastructure'
