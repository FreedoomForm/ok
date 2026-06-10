# ADR-002: Centralized API Route Wrapper (createApiRoute)

**Date:** June 2026  
**Status:** Accepted  
**Decision makers:** Architecture team

## Context

Before the refactor, all ~90 API route files in `src/app/api/` followed this pattern:

```ts
// Before: Every route file repeated this pattern
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ... business logic with inline Prisma queries ...
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Problems with this approach:
1. **Inconsistent error handling** — Some routes returned `{ error: "string" }`, others returned `{ error: { message } }`, others threw without catching.
2. **Inconsistent auth** — Each route implemented its own auth check, leading to subtle bugs (forgotten checks, wrong role verification).
3. **No request tracing** — No request IDs, no structured logging, no duration tracking.
4. **No rate limiting** — All endpoints were unlimited.
5. **Response format inconsistency** — Some routes wrapped in `{ data }`, others returned raw objects.
6. **Massive duplication** — ~90 routes × ~20 lines of boilerplate = ~1800 lines of duplicated code.

Options considered:
1. **Next.js middleware** — Use `middleware.ts` for auth/rate-limit, but can't wrap response format.
2. **Express-style middleware chain** — Not compatible with Next.js App Router route handlers.
3. **Factory function (createApiRoute)** — Higher-order function that wraps route handlers with cross-cutting concerns.
4. **Do nothing** — Keep the manual pattern.

## Decision

We chose **factory function** (`createApiRoute` / `createPublicApiRoute` / `createCustomerApiRoute`).

```ts
// After: Declarative, consistent, zero boilerplate
export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  rateLimit: 'read',
  handler: async ({ request, user, params }) => {
    const result = await executeListOrders({ user, ... })
    return { data: result }
  },
})
```

## Rationale

### Why NOT Next.js middleware?

Next.js middleware runs before route handlers but:
- It can't wrap the response — we need consistent `{ data, meta: { requestId } }` formatting.
- It can't catch errors thrown in handlers — we need centralized error → HTTP status mapping.
- It can't add duration tracking — it doesn't see the response after the handler completes.
- It can't inject context (user, params) into handlers.

Middleware handles routing (subdomain, auth redirect) but not API response standardization.

### Why NOT Express-style middleware?

Next.js App Router uses `export async function GET(request)` as route handlers. There's no `app.use()` chain. A factory function is the natural equivalent for Next.js.

### Why factory function?

1. **Declarative auth** — `requireAuth: ['SUPER_ADMIN']` replaces 5+ lines of imperative session + role checking.
2. **Consistent error format** — All `AppError` subclasses automatically map to the correct HTTP status and `{ error: { code, message } }` format.
3. **Request ID on every response** — `meta.requestId` is automatically added to both success and error responses.
4. **Rate limiting** — One-line `rateLimit: 'read'` adds rate limiting. No manual key generation or bucket management.
5. **Slow request detection** — Requests >500ms are logged with `logger.warn` automatically.
6. **Security headers** — CORS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy added to every response.
7. **Cookie support** — `cookies` field in handler return value sets cookies on response (needed for auth).

### Three factory variants

| Factory | Auth | Use Case |
|---|---|---|
| `createApiRoute` | Admin (next-auth session) | Most admin endpoints |
| `createPublicApiRoute` | None | Health check, site data, cron, auth |
| `createCustomerApiRoute` | Customer (customerToken cookie) | Customer portal endpoints |

## Consequences

### Positive
- ~90 route files now share consistent behavior
- Adding a new cross-cutting concern (e.g., request logging) requires changing one file
- Error responses are always safe (no stack traces leaked to clients)
- Request IDs enable end-to-end tracing across logs
- Rate limiting is opt-in per endpoint, not global

### Negative
- Factory function is a "framework within a framework" — new developers need to learn it
- Some routes need manual handlers (cookie-setting routes like login/verify-code)
- Factory function is tightly coupled to Next.js App Router API (would need changes for different framework)
- In-memory rate limiting doesn't persist across serverless cold starts (acceptable for current scale)

### Mitigations
- **Learning curve** — JSDoc comments and inline examples in `create-api-route.ts`. Consistent pattern across all routes.
- **Manual handlers** — For cookie-setting routes, developers can still use the response helpers (`successResponse`, `errorResponse`) manually while getting the same formatting.
- **Framework coupling** — The factory wraps Next.js `NextRequest`/`NextResponse`. If migrating to a different framework, only the factory needs updating, not 90 route files.
- **Rate limiting persistence** — For production scale, replace in-memory `Map` with Redis. The `checkRateLimitPreset` API stays the same.
