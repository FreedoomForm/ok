/**
 * Contract test helpers — Zod schemas and validators for API response contracts.
 *
 * Every API route built with `createApiRoute` returns one of:
 * - Success: `{ data: T, meta: { requestId: string } }`
 * - Error:   `{ error: { code: string, message: string, details? }, meta: { requestId: string } }`
 *
 * These helpers let contract tests validate the SHAPE of responses
 * without needing a running server or database.
 */

import { z } from 'zod'

// ── Success response schema ─────────────────────────────────────────────────

export const successResponseSchema = z.object({
  data: z.any(),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

// ── Error response schema ───────────────────────────────────────────────────

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    requestId: z.string(),
  }).optional(),
})

// ── Paginated response schema ───────────────────────────────────────────────

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  meta: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    requestId: z.string().optional(),
  }),
})

// ── Batch-get response schema ───────────────────────────────────────────────

export function batchGetResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.object({
      items: z.array(itemSchema),
      notFound: z.array(z.string()),
    }),
    meta: z.object({
      requestId: z.string(),
    }).optional(),
  })
}

// ── Validate response matches expected schema ───────────────────────────────

export function validateContract<T>(response: unknown, schema: z.ZodSchema<T>): T {
  return schema.parse(response)
}

// ── Known error code constants ──────────────────────────────────────────────

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ── HTTP status to error code mapping ───────────────────────────────────────

export const statusToErrorCode: Record<number, ErrorCode> = {
  400: ErrorCodes.BAD_REQUEST,
  401: ErrorCodes.UNAUTHORIZED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  422: ErrorCodes.VALIDATION_FAILED,
  429: ErrorCodes.RATE_LIMITED,
  500: ErrorCodes.INTERNAL_ERROR,
}
