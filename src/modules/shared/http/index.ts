/**
 * Shared HTTP route wrapper for Next.js App Router API routes.
 *
 * Replaces the repetitive try/catch + auth + response formatting pattern
 * found in ~90 route files.
 *
 * ## Usage
 *
 * ```ts
 * // app/api/admin/orders/route.ts
 * import { createApiRoute } from '@/modules/shared/http'
 * import { z } from 'zod'
 *
 * export const GET = createApiRoute({
 *   requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
 *   handler: async ({ request, user }) => {
 *     const orders = await getOrderList()
 *     return { data: orders }
 *   },
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasRole, type AuthUser } from '@/lib/auth-utils'
import { type AdminRole } from '@/lib/roles'
import { AppError, UnauthorizedError, ForbiddenError, InternalError } from '@/modules/shared/errors'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiRouteContext {
  request: NextRequest
  user: AuthUser
  params?: Record<string, string>
}

export interface ApiResponse<T = unknown> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiRouteConfig<T = unknown> {
  /** Array of admin roles allowed to access this route. Empty = any authenticated admin. */
  requireAuth?: AdminRole[]

  /** The handler function. Throw AppError for controlled error responses. */
  handler: (ctx: ApiRouteContext) => Promise<ApiResponse<T>>
}

// ── Response helpers ────────────────────────────────────────────────────────

function successResponse<T>(body: ApiResponse<T>, status = 200): NextResponse {
  return NextResponse.json(body, { status })
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Unexpected errors — log and return generic 500
  console.error('[api] Unhandled error:', error instanceof Error ? error.message : error)

  const internal = new InternalError()
  return NextResponse.json(internal.toJSON(), { status: internal.statusCode })
}

// ── Main factory ────────────────────────────────────────────────────────────

/**
 * Create a GET/POST/etc. API route handler with built-in auth, error handling,
 * and consistent response formatting.
 *
 * @example
 * ```ts
 * export const GET = createApiRoute({
 *   requireAuth: ['SUPER_ADMIN'],
 *   handler: async ({ user }) => ({ data: { message: `Hello ${user.email}` } }),
 * })
 * ```
 */
export function createApiRoute<T = unknown>(config: ApiRouteConfig<T>) {
  return async function routeHandler(
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {},
  ): Promise<NextResponse> {
    try {
      // ── Auth ──
      const user = await getAuthUser(request)

      if (!user) {
        throw new UnauthorizedError()
      }

      if (config.requireAuth && config.requireAuth.length > 0) {
        if (!hasRole(user, config.requireAuth)) {
          throw new ForbiddenError(
            `Role ${user.role} cannot access this endpoint`,
            { requiredRoles: config.requireAuth, actualRole: user.role },
          )
        }
      }

      // ── Await params (Next.js 15 async params) ──
      const resolvedParams = params ? await params : undefined

      // ── Handler ──
      const result = await config.handler({
        request,
        user,
        params: resolvedParams,
      })

      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * Create a public API route handler (no auth required).
 * Still provides consistent error handling and response formatting.
 */
export function createPublicApiRoute<T = unknown>(
  handler: (ctx: { request: NextRequest; params?: Record<string, string> }) => Promise<ApiResponse<T>>,
) {
  return async function routeHandler(
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {},
  ): Promise<NextResponse> {
    try {
      const resolvedParams = params ? await params : undefined
      const result = await handler({ request, params: resolvedParams })
      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  }
}
