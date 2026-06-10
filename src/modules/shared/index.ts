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

// Auth
export {
  getAuthUser,
  hasRole,
  canModifyAdmin,
  type AuthUser,
} from './auth'

// DB
export { db } from './db'

// Logger
export { logger, generateRequestId, type LogContext } from './logger'

// Audit
export { logAuditEvent, type AuditEventInput } from './audit'
