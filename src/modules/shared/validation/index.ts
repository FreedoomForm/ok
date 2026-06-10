/**
 * Shared validation utilities for API routes.
 *
 * Wraps Zod with consistent error formatting that integrates
 * with `ValidationFailedError` from the shared errors module.
 *
 * Also provides cursor pagination helpers for keyset pagination.
 */

import { z, ZodSchema } from 'zod'
import { ValidationFailedError } from '@/modules/shared/errors'

// ── Common schemas ──────────────────────────────────────────────────────────

/** Pagination parameters shared by all list endpoints. */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(), // opaque cursor string
  page: z.coerce.number().int().min(1).optional(), // alternative to cursor
})

export type PaginationInput = z.infer<typeof paginationSchema>

/** Generic CUID/UUID identifier. */
export const idSchema = z.string().min(1)

/** Sort direction. */
export const sortDirectionSchema = z.enum(['asc', 'desc'])

// ── Cursor pagination helpers ───────────────────────────────────────────────

/**
 * Encode a cursor value for use in pagination.
 *
 * Cursors are base64-encoded JSON strings that encode the sort key
 * and the entity ID, allowing efficient keyset pagination without
 * exposing internal IDs or offsets.
 *
 * @example
 * ```ts
 * const cursor = encodeCursor({ id: 'clx123', createdAt: '2024-01-15T10:30:00Z' })
 * // → "eyJpZCI6ImNseDEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTVUMTA6MzA6MDBaIn0="
 * ```
 */
export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

/**
 * Decode a cursor string back to its original payload.
 *
 * Returns `null` if the cursor is invalid or malformed.
 *
 * @example
 * ```ts
 * const payload = decodeCursor('eyJpZCI6ImNseDEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTVUMTA6MzA6MDBaIn0=')
 * // → { id: 'clx123', createdAt: '2024-01-15T10:30:00Z' }
 * ```
 */
export function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

/**
 * Build a Prisma `where` clause for cursor-based pagination.
 *
 * Given a decoded cursor payload, returns a Prisma-compatible filter
 * that selects rows after the cursor position.
 *
 * @example
 * ```ts
 * const cursorFilter = buildCursorFilter(decodedCursor, 'createdAt', 'desc')
 * // For descending: { createdAt: { lt: cursor.createdAt }, id: { lt: cursor.id } }
 * ```
 */
export function buildCursorFilter(
  cursor: Record<string, unknown>,
  sortKey: string,
  sortDirection: 'asc' | 'desc' = 'desc',
): Record<string, unknown> {
  const cursorValue = cursor[sortKey]
  const cursorId = cursor.id as string | undefined

  if (cursorValue === undefined) return {}

  const operator = sortDirection === 'desc' ? 'lt' : 'gt'

  // Simple keyset filter: rows after the cursor in sort order
  // For ties on the sort key, use ID as tiebreaker
  const filter: Record<string, unknown> = {}

  if (cursorId) {
    filter.OR = [
      { [sortKey]: { [operator]: cursorValue } },
      { [sortKey]: { equals: cursorValue }, id: { [operator]: cursorId } },
    ]
  } else {
    filter[sortKey] = { [operator]: cursorValue }
  }

  return filter
}

// ── Validate helper ─────────────────────────────────────────────────────────

/**
 * Validate data against a Zod schema. Throws `ValidationFailedError`
 * on failure, which `createApiRoute` automatically formats as a 422 response.
 *
 * @example
 * ```ts
 * const input = validateBody(createOrderSchema, await request.json())
 * ```
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root'
    if (!fieldErrors[path]) fieldErrors[path] = []
    fieldErrors[path].push(issue.message)
  }

  throw new ValidationFailedError('Validation failed', { fields: fieldErrors })
}

/**
 * Validate search params (query string) against a Zod schema.
 * Coerces all values from strings since URL search params are always strings.
 */
export function validateSearchParams<T>(schema: ZodSchema<T>, request: Request): T {
  const { searchParams } = new URL(request.url)
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  return validate(schema, raw)
}

/**
 * Validate request body against a Zod schema.
 */
export async function validateBody<T>(schema: ZodSchema<T>, request: Request): Promise<T> {
  const body = await request.json()
  return validate(schema, sanitizeInput(body))
}

// ── Input sanitization ──────────────────────────────────────────────────────

/**
 * Recursively sanitize input data:
 * - Trim whitespace from strings
 * - Strip null bytes from strings
 * - Recurse into nested objects and arrays
 *
 * @example
 * ```ts
 * const clean = sanitizeInput({ name: '  John\x00Doe  ' })
 * // → { name: 'JohnDoe' }
 * ```
 */
export function sanitizeInput<T>(data: T): T {
  if (typeof data === 'string') {
    return data.replace(/\0/g, '').trim() as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item)) as T
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeInput(value)
    }
    return result as T
  }

  return data
}
