/**
 * Shared module barrel export.
 *
 * All shared infrastructure is available from this single import path:
 * ```ts
 * import { createApiRoute, AppError, NotFoundError, validate } from '@/modules/shared'
 * ```
 */

// Errors
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationFailedError,
  RateLimitError,
  InternalError,
} from './errors'

// HTTP
export {
  createApiRoute,
  createPublicApiRoute,
  createCustomerApiRoute,
  API_VERSION,
  type ApiRouteContext,
  type CustomerApiRouteContext,
  type ApiResponse,
  type ApiRouteConfig,
  type CustomerApiRouteConfig,
  type CookieOption,
} from './http'

// HTTP - Rate limiting
export {
  checkRateLimit,
  checkRateLimitPreset,
  getClientIp,
  type RateLimitResult,
  type RateLimitPreset,
} from './http/rate-limit'

// HTTP - API client
export {
  fetchApi,
  type ApiResult,
} from './http/api-client'

// Validation
export {
  validate,
  validateSearchParams,
  validateBody,
  sanitizeInput,
  paginationSchema,
  idSchema,
  sortDirectionSchema,
  encodeCursor,
  decodeCursor,
  buildCursorFilter,
  type PaginationInput,
} from './validation'

// Validation - safe-json
export { safeJsonParse } from './validation/safe-json'

// Validation - validations (schemas)
export {
  phoneSchema,
  passwordSchema,
  emailSchema,
  clientCreateSchema,
  clientUpdateSchema,
  adminCreateSchema,
  adminUpdateSchema,
  orderCreateSchema,
  chatMessageSchema,
  bulkUpdateSchema,
  featureIdSchema,
  featureCreateSchema,
} from './validation/validations'

// Auth
export {
  getAuthUser,
  hasRole,
  canModifyAdmin,
  type AuthUser,
} from './auth'

// Auth - roles
export {
  ADMIN_ROLES,
  isAdminRole,
  ADMIN_ROLE_LEVEL,
  type AdminRole,
} from './auth/roles'

// Auth - admin-scope
export {
  getOwnerAdminId,
  getGroupAdminIds,
  filterCustomerIdsInGroup,
  isCustomerInGroup,
  type ScopedUser,
} from './auth/admin-scope'

// DB
export { db } from './db'

// Logger
export { logger, generateRequestId, type LogContext } from './logger'

// Audit
export { logAuditEvent, type AuditEventInput } from './audit'

// Geo
export {
  type LatLng,
  extractCoordsFromText,
  isShortGoogleMapsUrl,
  extractShortGoogleMapsUrl,
  formatLatLng,
  extractAnyUrl,
  isGoogleMapsLikeUrl,
  expandShortMapsUrl,
  parseGoogleMapsUrl,
} from './geo'

// Browser storage
export { getJsonFromLocalStorage } from './browser-storage'

// Events (outbox pattern)
export {
  writeToOutbox,
  processOutboxEvents,
  registerHandler,
  getHandler,
  clearHandlers,
  type OutboxWritableEvent,
  type ProcessOutboxResult,
  type EventHandler,
  type OutboxEventPayload,
} from './events'

// Contracts (batch DTOs)
export type { BatchGetInput, BatchGetResult } from './contracts'
