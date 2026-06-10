/**
 * Typed application errors for the Clean Architecture shared layer.
 *
 * Each error has a stable `code` (machine-readable), a human `message`,
 * and an optional `details` object for safe context.
 *
 * These integrate with `createApiRoute` — throwing an AppError (or subclass)
 * inside a handler automatically produces the correct HTTP status and
 * JSON error response.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

// ── 4xx errors ──────────────────────────────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super('BAD_REQUEST', message, 400, details)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super('UNAUTHORIZED', message, 401, details)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super('FORBIDDEN', message, 403, details)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string, details?: Record<string, unknown>) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`
    super('NOT_FOUND', message, 404, details)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, details)
    this.name = 'ConflictError'
  }
}

export class ValidationFailedError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, 422, details)
    this.name = 'ValidationFailedError'
  }
}

// ── 5xx errors ──────────────────────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', message, 500, details)
    this.name = 'InternalError'
  }
}
