/**
 * Shared validation utilities for API routes.
 *
 * Wraps Zod with consistent error formatting that integrates
 * with `ValidationFailedError` from the shared errors module.
 */

import { z, ZodSchema, ZodError } from 'zod'
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
  return validate(schema, body)
}
