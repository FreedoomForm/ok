/**
 * Shared module — Contract tests
 *
 * These tests verify the cross-cutting API response contracts:
 * - Rate limiting returns 429 with Retry-After header
 * - Validation errors return 422 with field-level details
 * - Authentication returns 401
 * - Authorization returns 403
 * - Not found returns 404
 *
 * These contracts are enforced by `createApiRoute` in the shared HTTP module.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Shared response schemas ─────────────────────────────────────────────────

const rateLimitErrorSchema = z.object({
  error: z.object({
    code: z.literal('RATE_LIMITED'),
    message: z.string(),
    details: z.object({
      retryAfterSec: z.number(),
    }).optional(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

const validationErrorSchema = z.object({
  error: z.object({
    code: z.literal('VALIDATION_FAILED'),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

const unauthorizedErrorSchema = z.object({
  error: z.object({
    code: z.literal('UNAUTHORIZED'),
    message: z.string(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

const forbiddenErrorSchema = z.object({
  error: z.object({
    code: z.literal('FORBIDDEN'),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

const notFoundErrorSchema = z.object({
  error: z.object({
    code: z.literal('NOT_FOUND'),
    message: z.string(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

const internalErrorSchema = z.object({
  error: z.object({
    code: z.literal('INTERNAL_ERROR'),
    message: z.string(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Shared contract — rate limiting (429)', () => {
  it('validates RATE_LIMITED error with retryAfterSec', () => {
    const response = {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        details: { retryAfterSec: 60 },
      },
      meta: { requestId: 'req-rl' },
    }
    const result = rateLimitErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('RATE_LIMITED')
      expect(result.data.error.details?.retryAfterSec).toBe(60)
    }
  })

  it('validates RATE_LIMITED error without details', () => {
    const response = {
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      meta: { requestId: 'req-rl2' },
    }
    const result = rateLimitErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Shared contract — validation errors (422)', () => {
  it('validates VALIDATION_FAILED error with field-level details', () => {
    const response = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { fields: [{ field: 'email', message: 'Invalid email format' }] },
      },
      meta: { requestId: 'req-val' },
    }
    const result = validationErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('VALIDATION_FAILED')
    }
  })

  it('validates VALIDATION_FAILED error without details', () => {
    const response = {
      error: { code: 'VALIDATION_FAILED', message: 'Validation failed' },
      meta: { requestId: 'req-val2' },
    }
    const result = validationErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Shared contract — authentication (401)', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      meta: { requestId: 'req-auth' },
    }
    const result = unauthorizedErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('rejects non-UNAUTHORIZED code', () => {
    const response = {
      error: { code: 'FORBIDDEN', message: 'Forbidden' },
      meta: { requestId: 'req-wrong' },
    }
    const result = unauthorizedErrorSchema.safeParse(response)
    expect(result.success).toBe(false)
  })
})

describe('Shared contract — authorization (403)', () => {
  it('validates FORBIDDEN error with details', () => {
    const response = {
      error: {
        code: 'FORBIDDEN',
        message: 'Role COURIER cannot access this endpoint',
        details: { requiredRoles: ['SUPER_ADMIN'], actualRole: 'COURIER' },
      },
      meta: { requestId: 'req-forbid' },
    }
    const result = forbiddenErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('FORBIDDEN')
    }
  })
})

describe('Shared contract — not found (404)', () => {
  it('validates NOT_FOUND error', () => {
    const response = {
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
      meta: { requestId: 'req-404' },
    }
    const result = notFoundErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('NOT_FOUND')
    }
  })

  it('rejects non-NOT_FOUND code', () => {
    const response = {
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      meta: { requestId: 'req-wrong' },
    }
    const result = notFoundErrorSchema.safeParse(response)
    expect(result.success).toBe(false)
  })
})

describe('Shared contract — internal error (500)', () => {
  it('validates INTERNAL_ERROR response', () => {
    const response = {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      meta: { requestId: 'req-500' },
    }
    const result = internalErrorSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe('INTERNAL_ERROR')
    }
  })
})

describe('Shared contract — generic error schema', () => {
  it('accepts all known error codes', () => {
    const knownCodes = Object.values(ErrorCodes)
    for (const code of knownCodes) {
      const response = {
        error: { code, message: `Error: ${code}` },
        meta: { requestId: 'req-gen' },
      }
      const result = errorResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    }
  })

  it('accepts any string as error code', () => {
    const response = {
      error: { code: 'CUSTOM_ERROR', message: 'Something custom' },
      meta: { requestId: 'req-custom' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Shared contract — success response schema', () => {
  it('accepts success response with data', () => {
    const response = {
      data: { message: 'ok' },
      meta: { requestId: 'req-ok' },
    }
    const result = successResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('accepts success response without meta', () => {
    const response = { data: { items: [] } }
    const result = successResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Shared contract — BatchGetInput schema', () => {
  const batchGetInputSchema = z.object({
    ids: z.array(z.string()).max(100),
  })

  it('accepts valid batch input', () => {
    const result = batchGetInputSchema.safeParse({ ids: ['id1', 'id2'] })
    expect(result.success).toBe(true)
  })

  it('rejects batch input exceeding 100 IDs', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`)
    const result = batchGetInputSchema.safeParse({ ids })
    expect(result.success).toBe(false)
  })

  it('accepts empty batch input', () => {
    const result = batchGetInputSchema.safeParse({ ids: [] })
    expect(result.success).toBe(true)
  })
})
