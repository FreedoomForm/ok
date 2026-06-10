/**
 * Sites module — Clean Architecture.
 *
 * This module encapsulates all multi-tenant site-related business logic
 * following a layered architecture:
 *
 * - `contracts/`      — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`    — Use-case queries/commands with auth & scope logic
 */

// Contracts (DTOs)
export type {
  WebsiteDTO,
  AdminWebsiteSettingsDTO,
  SiteUpdateData,
  SiteUpdateResult,
  AiEditData,
  AiEditResult,
  CustomerProfileDTO,
  CustomerProfileUpdateData,
  SiteAuthResult,
  SiteSendCodeResult,
  SiteRegistrationData,
  SiteRegistrationResult,
  CustomerPlanDTO,
  TogglePlanResult,
  TodayMenuDTO,
  TodayMenuDishDTO,
  CustomerLogoutResult,
} from './contracts'

// Application queries
export {
  executeGetSite,
  type GetSiteQuery,
  executeGetCustomerProfile,
  type GetCustomerProfileQuery,
  executeGetTodayMenu,
  type GetTodayMenuQuery,
  executeGetCustomerPlan,
  type GetCustomerPlanQuery,
} from './application/queries'

// Application commands
export {
  executeUpdateSite,
  type UpdateSiteCommand,
  executeSiteLogin,
  type SiteLoginCommand,
  executeSiteRegister,
  type SiteRegisterCommand,
  executeSiteSendCode,
  type SiteSendCodeCommand,
  executeSiteVerifyCode,
  type SiteVerifyCodeCommand,
  executeCustomerLogout,
  type CustomerLogoutCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  findSiteBySubdomain,
  findAdminWebsiteSettings,
  findCustomerProfile,
  updateCustomerProfile,
  findTodayMenu,
  findCustomerPlan,
  toggleCustomerPlan,
  listCustomerOrders,
  upsertWebsite,
  sendSiteOtpCode,
  verifySiteOtpCode,
  siteLogin,
  siteRegister,
  aiEditWebsite,
  getSiteGroupAdminIds,
  normalizePhone,
} from './infrastructure'
