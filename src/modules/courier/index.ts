/**
 * Courier module — Clean Architecture.
 *
 * This module encapsulates all courier-related business logic following
 * a layered architecture:
 *
 * - `contracts/`      — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`    — Use-case queries/commands with auth & scope logic
 */

// Contracts (DTOs)
export type {
  CourierProfileDTO,
  CourierOrderDTO,
  CourierOrderCustomerDTO,
  NextOrderDTO,
  CourierStatsDTO,
  CourierRouteDTO,
  LocationUpdateData,
  ProfileUpdateData,
  CompleteOrderResult,
  FailOrderData,
  FailOrderResult,
  WithdrawData,
  WithdrawResult,
  AdminCourierDTO,
  AdminCourierPatchData,
  AdminCourierCreateData,
} from './contracts'

// Application queries
export {
  executeGetCourierProfile,
  executeListCourierOrders,
  executeGetNextOrder,
  executeGetCourierStats,
  executeGetCourierRoute,
  executeListAdminCouriers,
  type GetCourierProfileQuery,
  type ListCourierOrdersQuery,
  type GetNextOrderQuery,
  type GetCourierStatsQuery,
  type GetCourierRouteQuery,
  type ListAdminCouriersQuery,
} from './application/queries'

// Application commands
export {
  executeUpdateLocation,
  executeUpdateProfile,
  executeCompleteOrder,
  executeFailOrder,
  executeRequestWithdraw,
  executeAdminUpdateCourier,
  executeAdminCreateCourier,
  type UpdateLocationCommand,
  type UpdateProfileCommand,
  type CompleteOrderCommand,
  type FailOrderCommand,
  type RequestWithdrawCommand,
  type AdminUpdateCourierCommand,
  type AdminCreateCourierCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  findCourierProfile,
  listCourierOrders,
  findNextOrder,
  getCourierStats,
  getCourierRoute,
  findOrderForCourier,
  findCourierForWithdraw,
  calculateAvailableBalance,
  findPayerAdmin,
  processWithdraw,
  updateCourierLocation,
  updateCourierProfile,
  updateCourierPassword,
  findAdminWithPassword,
  isEmailTaken,
  completeOrder,
  failOrder,
  logOrderEvent,
  logAction,
  listCouriersForAdmin,
  findCourierForAdminUpdate,
  adminUpdateCourier,
  createCourierAccount,
  isCourierEmailTaken,
  findCourierCreatedBy,
} from './infrastructure'
