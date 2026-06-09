/* ═════════════════════════════════════════════
   Backend Design System v1.0 — Error Handling
   «Чистая библиотека»

   Стандартный формат ошибок:
   { error: { code, message, details, requestId } }

   Error codes — стабильные машинные коды
   Message — понятный человеку текст
   Details — безопасные детали
   RequestId — для поиска в логах
   ═════════════════════════════════════════════ */

export type ErrorCode =
  // Auth
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TRIAL_EXPIRED'
  | 'ADMIN_INACTIVE'
  | 'INVALID_CREDENTIALS'

  // Validation
  | 'VALIDATION_FAILED'
  | 'INVALID_INPUT'

  // Not Found
  | 'NOT_FOUND'
  | 'ADMIN_NOT_FOUND'
  | 'CLIENT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'SET_NOT_FOUND'
  | 'INGREDIENT_NOT_FOUND'
  | 'DISH_NOT_FOUND'
  | 'MENU_NOT_FOUND'
  | 'COURIER_NOT_FOUND'
  | 'WEBSITE_NOT_FOUND'

  // Conflicts
  | 'CONFLICT'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_NAME'
  | 'VERSION_CONFLICT'
  | 'ORDER_STATUS_INVALID'

  // Rate Limiting
  | 'RATE_LIMIT_EXCEEDED'

  // Internal
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TRIAL_EXPIRED: 403,
  ADMIN_INACTIVE: 403,
  INVALID_CREDENTIALS: 401,
  VALIDATION_FAILED: 400,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  ADMIN_NOT_FOUND: 404,
  CLIENT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  SET_NOT_FOUND: 404,
  INGREDIENT_NOT_FOUND: 404,
  DISH_NOT_FOUND: 404,
  MENU_NOT_FOUND: 404,
  COURIER_NOT_FOUND: 404,
  WEBSITE_NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE_EMAIL: 409,
  DUPLICATE_NAME: 409,
  VERSION_CONFLICT: 409,
  ORDER_STATUS_INVALID: 400,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
};

export interface AppErrorDetails {
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: AppErrorDetails;
  public readonly requestId?: string;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: AppErrorDetails,
    requestId?: string,
  ) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = HTTP_STATUS_MAP[code];
    this.details = details;
    this.requestId = requestId;
    this.isOperational = true;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        ...(this.requestId && { requestId: this.requestId }),
      },
    };
  }
}

// ── Factory methods for common errors ──

export const Errors = {
  unauthorized: (requestId?: string) =>
    new AppError('UNAUTHORIZED', 'Не авторизован', undefined, requestId),

  forbidden: (message = 'Нет прав доступа', requestId?: string) =>
    new AppError('FORBIDDEN', message, undefined, requestId),

  trialExpired: (requestId?: string) =>
    new AppError('TRIAL_EXPIRED', 'Триал период истёк', undefined, requestId),

  adminInactive: (requestId?: string) =>
    new AppError('ADMIN_INACTIVE', 'Аккаунт деактивирован', undefined, requestId),

  validationFailed: (details: AppErrorDetails, requestId?: string) =>
    new AppError('VALIDATION_FAILED', 'Ошибка валидации', details, requestId),

  notFound: (entity: string, id?: string, requestId?: string) =>
    new AppError(
      `${entity.toUpperCase()}_NOT_FOUND` as ErrorCode,
      `${entity} не найден`,
      id ? { [`${entity}Id`]: id } : undefined,
      requestId,
    ),

  duplicateEmail: (email?: string, requestId?: string) =>
    new AppError('DUPLICATE_EMAIL', 'Email уже зарегистрирован', email ? { email } : undefined, requestId),

  duplicateName: (name?: string, requestId?: string) =>
    new AppError('DUPLICATE_NAME', 'Название уже существует', name ? { name } : undefined, requestId),

  versionConflict: (requestId?: string) =>
    new AppError('VERSION_CONFLICT', 'Данные были изменены другим пользователем. Обновите страницу.', undefined, requestId),

  orderStatusInvalid: (from?: string, to?: string, requestId?: string) =>
    new AppError('ORDER_STATUS_INVALID', 'Недопустимый переход статуса', { from, to }, requestId),

  rateLimitExceeded: (requestId?: string) =>
    new AppError('RATE_LIMIT_EXCEEDED', 'Превышен лимит запросов', undefined, requestId),

  internal: (message = 'Внутренняя ошибка сервера', requestId?: string) =>
    new AppError('INTERNAL_ERROR', message, undefined, requestId),

  database: (message?: string, requestId?: string) =>
    new AppError('DATABASE_ERROR', message || 'Ошибка базы данных', undefined, requestId),
};

// ── Helper: convert unknown errors to AppError ──

export function toAppError(error: unknown, requestId?: string): AppError {
  if (error instanceof AppError) {
    if (requestId && !error.requestId) {
      return new AppError(error.code, error.message, error.details, requestId);
    }
    return error;
  }

  if (error instanceof Error) {
    // Prisma errors
    if (error.message.includes('Unique constraint')) {
      return Errors.duplicateName(undefined, requestId);
    }
    if (error.message.includes('Record to update not found')) {
      return Errors.notFound('record', undefined, requestId);
    }
    return Errors.internal(error.message, requestId);
  }

  return Errors.internal(undefined, requestId);
}
