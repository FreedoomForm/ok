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
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { type AdminRole } from '@/lib/roles'
import { AppError, UnauthorizedError, ForbiddenError, RateLimitError, InternalError } from '@/modules/shared/errors'
import { logger } from '@/modules/shared/logger'
import { generateRequestId } from '@/modules/shared/logger/request-id'
import { checkRateLimitPreset, type RateLimitPreset } from './rate-limit'

// ── Types ───────────────────────────────────────────────────────────────────

export interface CookieOption {
  name: string
  value: string
  options?: Record<string, unknown>
}

export interface ApiRouteContext {
  request: NextRequest
  user: AuthUser
  params?: Record<string, string>
}

export interface CustomerApiRouteContext {
  request: NextRequest
  /** Non-null customer — the factory rejects unauthenticated requests before calling the handler. */
  customer: NonNullable<Awaited<ReturnType<typeof getCustomerFromRequest>>>
  params?: Record<string, string>
}

export interface ApiResponse<T = unknown> {
  data: T
  meta?: Record<string, unknown>
  message?: string
  /** Cookies to set on the response */
  cookies?: CookieOption[]
}

export interface ApiRouteConfig<T = unknown> {
  /** Array of admin roles allowed to access this route. Empty = any authenticated admin. */
  requireAuth?: AdminRole[]

  /** Rate limit preset: 'auth' (10/min), 'read' (120/min), 'write' (60/min) */
  rateLimit?: RateLimitPreset

  /** The handler function. Throw AppError for controlled error responses. */
  handler: (ctx: ApiRouteContext) => Promise<ApiResponse<T>>
}

export interface CustomerApiRouteConfig<T = unknown> {
  /** Rate limit preset: 'auth' (10/min), 'read' (120/min), 'write' (60/min) */
  rateLimit?: RateLimitPreset

  /** The handler function. Receives the authenticated customer. Throw AppError for controlled error responses. */
  handler: (ctx: CustomerApiRouteContext) => Promise<ApiResponse<T>>
}

// ── CORS helpers ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }

  if (ALLOWED_ORIGINS.length > 0 && origin) {
    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Cron-Token'
      headers['Access-Control-Max-Age'] = '86400'
    }
  }

  return headers
}

// ── Response helpers ────────────────────────────────────────────────────────

function applyCookies(response: NextResponse, cookies?: CookieOption[]) {
  if (!cookies || cookies.length === 0) return
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options as any)
  }
}

function applyCorsAndSecurityHeaders(response: NextResponse, request: NextRequest): void {
  const headers = corsHeaders(request)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
}

function successResponse<T>(body: ApiResponse<T>, status: number, requestId: string, request: NextRequest): NextResponse {
  const response = NextResponse.json(
    { ...body, meta: { ...body.meta, requestId } },
    { status },
  )
  applyCookies(response, body.cookies)
  applyCorsAndSecurityHeaders(response, request)
  return response
}

function errorResponse(error: unknown, requestId: string, request: NextRequest): NextResponse {
  if (error instanceof AppError) {
    const body = error.toJSON()
    const headers: Record<string, string> = {}
    if (error instanceof RateLimitError) {
      headers['Retry-After'] = String(error.details?.retryAfterSec ?? 60)
    }
    const response = NextResponse.json(
      { ...body, meta: { requestId } },
      { status: error.statusCode, headers },
    )
    applyCorsAndSecurityHeaders(response, request)
    return response
  }

  // Unexpected errors — log and return generic 500
  logger.error('Unhandled API error', {
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  const internal = new InternalError()
  const response = NextResponse.json(
    { ...internal.toJSON(), meta: { requestId } },
    { status: internal.statusCode },
  )
  applyCorsAndSecurityHeaders(response, request)
  return response
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
 *   rateLimit: 'read',
 *   handler: async ({ user }) => ({ data: { message: `Hello ${user.email}` } }),
 * })
 * ```
 */
export function createApiRoute<T = unknown>(config: ApiRouteConfig<T>) {
  return async function routeHandler(
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {},
  ): Promise<NextResponse> {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      // ── Rate limiting ──
      if (config.rateLimit) {
        const rateLimitResult = checkRateLimitPreset(request, config.rateLimit)
        if (!rateLimitResult.allowed) {
          throw new RateLimitError(rateLimitResult.retryAfterSec)
        }
      }

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

      const duration = Date.now() - startTime
      if (duration > 500) {
        logger.warn('Slow request', {
          requestId,
          method: request.method,
          url: request.nextUrl.pathname,
          durationMs: duration,
          userId: user.id,
        })
      }

      return successResponse(result, 200, requestId, request)
    } catch (error) {
      return errorResponse(error, requestId, request)
    }
  }
}

/**
 * Create a public API route handler (no auth required).
 * Still provides consistent error handling, rate limiting, and response formatting.
 */
export function createPublicApiRoute<T = unknown>(
  handler: (ctx: { request: NextRequest; params?: Record<string, string> }) => Promise<ApiResponse<T>>,
) {
  return async function routeHandler(
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {},
  ): Promise<NextResponse> {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      const resolvedParams = params ? await params : undefined
      const result = await handler({ request, params: resolvedParams })

      const duration = Date.now() - startTime
      if (duration > 500) {
        logger.warn('Slow request', {
          requestId,
          method: request.method,
          url: request.nextUrl.pathname,
          durationMs: duration,
        })
      }

      return successResponse(result, 200, requestId, request)
    } catch (error) {
      return errorResponse(error, requestId, request)
    }
  }
}

/**
 * Create a customer-authenticated API route handler.
 * Uses `getCustomerFromRequest` for authentication and provides
 * the authenticated customer to the handler.
 */
export function createCustomerApiRoute<T = unknown>(config: CustomerApiRouteConfig<T>) {
  return async function routeHandler(
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {},
  ): Promise<NextResponse> {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      // ── Rate limiting ──
      if (config.rateLimit) {
        const rateLimitResult = checkRateLimitPreset(request, config.rateLimit)
        if (!rateLimitResult.allowed) {
          throw new RateLimitError(rateLimitResult.retryAfterSec)
        }
      }

      const customer = await getCustomerFromRequest(request)
      if (!customer) {
        throw new UnauthorizedError()
      }

      const resolvedParams = params ? await params : undefined

      const result = await config.handler({
        request,
        customer,
        params: resolvedParams,
      })

      const duration = Date.now() - startTime
      if (duration > 500) {
        logger.warn('Slow request', {
          requestId,
          method: request.method,
          url: request.nextUrl.pathname,
          durationMs: duration,
          customerId: customer.id,
        })
      }

      return successResponse(result, 200, requestId, request)
    } catch (error) {
      return errorResponse(error, requestId, request)
    }
  }
}
