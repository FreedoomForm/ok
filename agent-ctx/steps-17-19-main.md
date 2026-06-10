# Steps 17-19 — Route Migration, Request Tracing, Security Middleware

## Agent: main
## Task ID: Steps 17-19

---

## Step 17: Migrate remaining routes to createApiRoute + cleanup

### Summary
Migrated all remaining legacy routes from raw `try/catch` + `getAuthUser`/`getCustomerFromRequest` + inline Prisma pattern to `createApiRoute`, `createPublicApiRoute`, or new `createCustomerApiRoute`.

### Key Changes

1. **Created `createCustomerApiRoute`** in `modules/shared/http/index.ts`
   - New factory function for customer-authenticated routes
   - Uses `getCustomerFromRequest` for auth
   - Guarantees non-null `customer` in handler via type narrowing
   - Supports rate limiting via `rateLimit` config option
   - Includes request ID tracking, duration logging, cookie support, CORS headers

2. **Added cookie support to `ApiResponse`**
   - New `CookieOption` type and `cookies` field on `ApiResponse`
   - `applyCookies()` helper sets cookies on the response
   - Enables cookie-setting routes (login, verify-code, logout) to use the route factories

3. **Migrated 10 routes:**
   - `admin/clients/run-auto-orders` → `createApiRoute` with `requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN']`
   - `customers/auth/login` → `createPublicApiRoute` with rate limiting
   - `customers/auth/logout` → `createPublicApiRoute` with cookie clearing
   - `customers/orders/[id]` → `createCustomerApiRoute`
   - `customers/today-menu` → `createCustomerApiRoute`
   - `customers/plan` → `createCustomerApiRoute`
   - `customers/profile` → `createCustomerApiRoute` (GET + PATCH)
   - `customers/orders` → `createCustomerApiRoute`
   - `sites/[subdomain]/auth/verify-code` → `createPublicApiRoute` with cookies
   - `sites/[subdomain]/auth/login` → `createPublicApiRoute` with rate limiting + cookies

### Routes already migrated (confirmed from prior steps)
All routes listed in the Step 17 spec that were already using `createApiRoute`/`createPublicApiRoute`:
- cron/scheduler, cron/check-trials, system/auto-scheduler, auth/signup, auth/login
- admin/dispatch/start-day, admin/dispatch/normalize-drafts, admin/features, admin/scheduler
- admin/live-map, admin/database-snapshot, admin/database-import-xlsx, admin/database-import-xlsx-all
- admin/database-row, customers (GET)

---

## Step 18: Request ID tracing + structured logging

### Key Changes

1. **Request ID generation** — `modules/shared/logger/request-id.ts`
   - `generateRequestId()` using `crypto.randomUUID()`
   - Ensures unique, collision-resistant IDs for every request

2. **Request ID middleware in route factories**
   - All three factories (`createApiRoute`, `createPublicApiRoute`, `createCustomerApiRoute`) now:
     - Generate a `requestId` at the start of each request
     - Include `requestId` in the response `meta` field
     - Pass `requestId` to the structured logger for error logging

3. **Duration tracking**
   - Track request duration with `Date.now()` at start/end
   - Log slow requests (>500ms) as warnings with `requestId`, `method`, `url`, `durationMs`
   - Includes user/customer ID for tracing

4. **Slow DB query logging** — `src/lib/db.ts`
   - Prisma configured with `log: [{ emit: 'event', level: 'query' }]`
   - Event listener logs queries >150ms as structured JSON warnings
   - Includes `durationMs`, truncated `query`, truncated `params`, `timestamp`

---

## Step 19: Rate limiting + security middleware

### Key Changes

1. **Rate limiter** — `modules/shared/http/rate-limit.ts`
   - In-memory sliding-window rate limiter using `Map<string, Bucket>`
   - Presets: `auth` (10/min), `read` (120/min), `write` (60/min)
   - `checkRateLimitPreset(request, preset, userId?)` auto-builds key from IP + userId
   - Periodic cleanup of expired buckets every 60 seconds
   - Exported `RateLimitPreset` type and `RateLimitResult` interface
   - Route config supports `rateLimit` option on `createApiRoute` and `createCustomerApiRoute`

2. **`RateLimitError`** — Added to `modules/shared/errors/index.ts`
   - 429 status code with `retryAfterSec` in details
   - `errorResponse` helper adds `Retry-After` header for `RateLimitError`

3. **CORS hardening** — In `modules/shared/http/index.ts`
   - `corsHeaders()` function reads `CORS_ALLOWED_ORIGINS` env var
   - Sets `Access-Control-Allow-Origin` only for whitelisted origins
   - Sets `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age`
   - Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

4. **Input sanitization** — Added to `modules/shared/validation/index.ts`
   - `sanitizeInput<T>(data: T): T` — recursively trims strings and strips null bytes
   - Applied automatically in `validateBody()` before Zod validation
   - Handles nested objects and arrays

5. **Audit log** — `modules/shared/audit/index.ts`
   - `logAuditEvent(event: AuditEventInput)` — writes to `action_logs` table
   - Non-blocking: errors are logged but never throw
   - `AuditEventInput` type with `adminId`, `action`, `entityType`, `entityId`, `oldValues`, `newValues`, `description`, `details`, `requestId`
   - Exported from `modules/shared/index.ts` barrel

6. **Updated barrel exports** — `modules/shared/index.ts`
   - Added `RateLimitError`, `checkRateLimit`, `checkRateLimitPreset`, `getClientIp`, `RateLimitResult`, `RateLimitPreset`, `sanitizeInput`, `logAuditEvent`, `AuditEventInput`

### Auth routes updated to use RateLimitError
- `auth/login/route.ts` — throws `RateLimitError` instead of `BadRequestError` for rate-limited requests
- `customers/auth/login/route.ts` — same
- `sites/[subdomain]/auth/login/route.ts` — same

### Build verification
- `npx tsc --noEmit` — 0 errors
- `bun run lint` — 0 errors, 448 warnings (all pre-existing)
