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
  InternalError,
} from './errors'

// HTTP
export {
  createApiRoute,
  createPublicApiRoute,
  type ApiRouteContext,
  type ApiResponse,
  type ApiRouteConfig,
} from './http'

// Validation
export {
  validate,
  validateSearchParams,
  validateBody,
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
export { logger, type LogContext } from './logger'
