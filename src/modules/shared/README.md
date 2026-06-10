# Shared Module

Shared infrastructure for all Clean Architecture modules in the AutoFood delivery platform.

## Purpose

Provides cross-cutting concerns used by every module: error handling, HTTP route wrappers, validation, authentication, database access, logging, rate limiting, and audit logging. This is the foundation layer that all other modules depend on.

## Directory Structure

```
src/modules/shared/
├── errors/
│   └── index.ts            # AppError hierarchy (base + 7 subclasses)
├── http/
│   ├── index.ts            # createApiRoute, createPublicApiRoute, createCustomerApiRoute
│   └── rate-limit.ts       # In-memory sliding-window rate limiter
├── validation/
│   └── index.ts            # Zod helpers, cursor pagination, input sanitization
├── auth/
│   └── index.ts            # Re-exports from @/lib/auth-utils
├── db/
│   └── index.ts            # Re-exports db from @/lib/db
├── logger/
│   ├── index.ts            # Structured JSON logger
│   └── request-id.ts       # Nanoid-based request ID generation
├── audit/
│   └── index.ts            # Audit event logging (action_logs table)
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Errors (`modules/shared/errors`)
| Export | Description |
|---|---|
| `AppError` | Base error class with `code`, `message`, `statusCode`, `details` |
| `BadRequestError` | 400 — Malformed request |
| `UnauthorizedError` | 401 — Authentication required |
| `ForbiddenError` | 403 — Insufficient permissions |
| `NotFoundError` | 404 — Resource not found |
| `ConflictError` | 409 — Duplicate/conflict |
| `ValidationFailedError` | 422 — Zod validation failed (includes field errors) |
| `RateLimitError` | 429 — Too many requests |
| `InternalError` | 500 — Unexpected server error |

### HTTP (`modules/shared/http`)
| Export | Description |
|---|---|
| `createApiRoute(config)` | Factory for admin-authenticated routes |
| `createPublicApiRoute(handler)` | Factory for public (no auth) routes |
| `createCustomerApiRoute(config)` | Factory for customer-authenticated routes |
| `ApiRouteContext` | Context type: `{ request, user, params }` |
| `CustomerApiRouteContext` | Context type: `{ request, customer, params }` |
| `ApiResponse<T>` | Response type: `{ data, meta?, message?, cookies? }` |
| `ApiRouteConfig<T>` | Config type: `{ requireAuth?, rateLimit?, handler }` |
| `CookieOption` | Cookie type: `{ name, value, options? }` |

### Rate Limiting (`modules/shared/http/rate-limit`)
| Export | Description |
|---|---|
| `checkRateLimit(key, limit, windowMs)` | Core rate limit check |
| `checkRateLimitPreset(request, preset, userId?)` | Preset-based check |
| `getClientIp(headers)` | Extract client IP from headers |
| `RateLimitResult` | `{ allowed, retryAfterSec, remaining }` |
| `RateLimitPreset` | `'auth' \| 'read' \| 'write'` |

**Presets:**
| Preset | Limit | Window |
|---|---|---|
| `auth` | 10 req/min | 60,000ms |
| `read` | 120 req/min | 60,000ms |
| `write` | 60 req/min | 60,000ms |

### Validation (`modules/shared/validation`)
| Export | Description |
|---|---|
| `validate(schema, data)` | Validate data against Zod schema (throws `ValidationFailedError`) |
| `validateSearchParams(schema, request)` | Validate URL search params |
| `validateBody(schema, request)` | Validate + sanitize request body |
| `sanitizeInput(data)` | Recursively trim + strip null bytes |
| `paginationSchema` | Zod schema: `{ limit, cursor?, page? }` |
| `idSchema` | Zod schema: `z.string().min(1)` |
| `sortDirectionSchema` | Zod schema: `z.enum(['asc', 'desc'])` |
| `encodeCursor(payload)` | Encode cursor for keyset pagination |
| `decodeCursor(cursor)` | Decode cursor string |
| `buildCursorFilter(cursor, sortKey, direction)` | Build Prisma where clause for cursor |

### Auth (`modules/shared/auth`)
| Export | Description |
|---|---|
| `getAuthUser(request)` | Get authenticated admin from request |
| `hasRole(user, roles)` | Check if user has one of the specified roles |
| `canModifyAdmin(actor, target)` | Check if actor can modify target admin |
| `AuthUser` | Type: `{ id, email, name, role, ... }` |

### Database (`modules/shared/db`)
| Export | Description |
|---|---|
| `db` | Prisma client singleton |

### Logger (`modules/shared/logger`)
| Export | Description |
|---|---|
| `logger.info(message, context?)` | Info-level log |
| `logger.warn(message, context?)` | Warn-level log |
| `logger.error(message, context?)` | Error-level log |
| `logger.debug(message, context?)` | Debug-level log (dev only) |
| `generateRequestId()` | Generate nanoid-based request ID |
| `LogContext` | Type: `{ requestId?, userId?, route?, method?, ... }` |

### Audit (`modules/shared/audit`)
| Export | Description |
|---|---|
| `logAuditEvent(event)` | Write audit event to action_logs table (non-blocking) |
| `AuditEventInput` | Type: `{ adminId, action, entityType?, entityId?, ... }` |

## Key DTOs

| DTO | Purpose |
|---|---|
| `AuthUser` | Authenticated admin user (from next-auth session) |
| `PaginationInput` | `{ limit: number, cursor?: string, page?: number }` |
| `AuditEventInput` | Audit event data for action_logs table |

## Role-Based Scoping Rules

The shared module itself does not enforce scoping — it provides the primitives that other modules use:

- `hasRole(user, roles)` — Check if user has required role
- `canModifyAdmin(actor, target)` — Check if actor can modify target
- `createApiRoute({ requireAuth })` — Route-level role enforcement
- `checkRateLimitPreset()` — Rate limiting per IP/user

## Architecture Integration

```
API Route (createApiRoute)
  → Auth check (modules/shared/auth)
  → Rate limiting (modules/shared/http/rate-limit)
  → Request ID (modules/shared/logger/request-id)
  → Validation (modules/shared/validation)
  → Application Layer (modules/<domain>/application)
    → Repository (modules/<domain>/infrastructure)
      → Database (modules/shared/db)
  → Error handling (modules/shared/errors)
  → Audit logging (modules/shared/audit)
  → Structured logging (modules/shared/logger)
```
