/* ═════════════════════════════════════════════
   Backend Design System v1.0 — HTTP Helpers
   «Чистая библиотека»

   - requestId generation
   - Standard response wrappers
   - API route helper with error handling
   ═════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, Errors, toAppError } from '../errors';
import { logger } from '../logger';

// ── Request ID ──

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

export function getRequestId(request: NextRequest): string {
  return (request.headers.get('x-request-id') as string) || generateRequestId();
}

// ── Standard Response Wrappers ──

export function successResponse<T>(data: T, meta?: Record<string, unknown>, requestId?: string): NextResponse {
  return NextResponse.json({
    data,
    ...(meta && { meta: { ...meta, ...(requestId && { requestId }) } }),
    ...(!meta && requestId && { meta: { requestId } }),
  });
}

export function listResponse<T>(
  items: T[],
  options: {
    limit: number;
    nextCursor?: string | null;
    hasMore?: boolean;
    requestId?: string;
    total?: number;
  },
): NextResponse {
  return NextResponse.json({
    data: items,
    meta: {
      requestId: options.requestId,
      page: {
        limit: options.limit,
        ...(options.nextCursor && { nextCursor: options.nextCursor }),
        hasMore: options.hasMore ?? !!options.nextCursor,
        ...(options.total !== undefined && { total: options.total }),
      },
    },
  });
}

export function errorResponse(error: unknown, requestId?: string): NextResponse {
  const appError = toAppError(error, requestId);

  // Log all errors
  if (appError.statusCode >= 500) {
    logger.error(appError.message, {
      requestId,
      code: appError.code,
      stack: appError.stack,
    });
  } else {
    logger.warn(appError.message, {
      requestId,
      code: appError.code,
      statusCode: appError.statusCode,
    });
  }

  return NextResponse.json(appError.toJSON(), { status: appError.statusCode });
}

// ── API Route Helper ──

export interface ApiRouteContext {
  params: Promise<Record<string, string>>;
}

type ApiHandler = (
  request: NextRequest,
  context: ApiRouteContext,
) => Promise<NextResponse>;

interface ApiRouteOptions {
  requireAuth?: boolean;
  requiredRole?: string[];
  slowThresholdMs?: number;
}

/**
 * Wraps an API route handler with:
 * - Request ID generation
 * - Error handling
 * - Request/response logging
 * - Duration tracking
 */
export function apiRoute(
  handler: ApiHandler,
  options: ApiRouteOptions = {},
): (request: NextRequest, context: ApiRouteContext) => Promise<NextResponse> {
  return async (request: NextRequest, context: ApiRouteContext) => {
    const requestId = getRequestId(request);
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const route = url.pathname;

    const routeLogger = logger.withContext({ requestId, method, route });

    try {
      routeLogger.debug(`${method} ${route} started`);

      const response = await handler(request, context);
      const durationMs = Date.now() - startTime;

      routeLogger.request({
        requestId,
        method,
        route,
        status: response.status,
        durationMs,
      });

      // Add requestId to response headers
      response.headers.set('x-request-id', requestId);

      // Check slow threshold
      const threshold = options.slowThresholdMs || 500;
      if (durationMs > threshold) {
        routeLogger.slowQuery(route, durationMs);
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      routeLogger.request({
        requestId,
        method,
        route,
        status: 500,
        durationMs,
      });

      return errorResponse(error, requestId);
    }
  };
}

// ── Pagination Helpers ──

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export function parsePaginationParams(request: NextRequest): PaginationParams {
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') || '25'), 1),
    100, // max limit
  );
  const cursor = url.searchParams.get('cursor') || undefined;

  return { limit, cursor };
}

export interface CursorInfo {
  nextCursor?: string;
  hasMore: boolean;
}

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}
