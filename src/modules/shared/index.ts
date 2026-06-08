/* ═════════════════════════════════════════════
   Backend Design System v1.0 — Shared Module Index
   «Чистая библиотека»
   ═════════════════════════════════════════════ */

export { AppError, Errors, toAppError } from './errors';
export type { ErrorCode, AppErrorDetails } from './errors';

export { logger } from './logger';
export type { LogEntry, RequestLogEntry } from './logger';

export {
  apiRoute,
  successResponse,
  listResponse,
  errorResponse,
  generateRequestId,
  getRequestId,
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
} from './http';
export type { PaginationParams, CursorInfo, ApiRouteContext } from './http';

export {
  validateOrThrow,
  paginationSchema,
  uuidSchema,
  emailSchema,
  phoneSchema,
  orderStatusSchema,
  paymentStatusSchema,
  paymentMethodSchema,
  planTypeSchema,
  adminRoleSchema,
  orderTypeSchema,
  transactionTypeSchema,
} from './validation';

export {
  createInstrumentedPrismaClient,
  cursorPaginate,
  adminSummarySelect,
  adminListItemSelect,
  customerSummarySelect,
  customerListItemSelect,
  orderListItemSelect,
  menuSetListItemSelect,
  transactionListItemSelect,
} from './db';
