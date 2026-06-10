# API Contracts

> Comprehensive API contract documentation for the AutoFood delivery platform.
> All endpoints use `createApiRoute`, `createPublicApiRoute`, or `createCustomerApiRoute`.

## 1. Response Format

### Success Response

Every successful API response follows this format:

```json
{
  "data": T,
  "meta": {
    "requestId": "V1StGXR8_Z5jdHi6B-myT"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data` | `T` | The response payload (type varies by endpoint) |
| `meta.requestId` | `string` | Nanoid-based request ID for tracing |

Optional fields on success:
| Field | Type | Description |
|---|---|---|
| `message` | `string` | Human-readable success message (e.g., "Order created") |
| `cookies` | `CookieOption[]` | Cookies to set on the response (auth endpoints) |

### Error Response

Every error response follows this format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found: clx123",
    "details": { ... }
  },
  "meta": {
    "requestId": "V1StGXR8_Z5jdHi6B-myT"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `error.code` | `string` | Machine-readable error code (stable, never changes) |
| `error.message` | `string` | Human-readable error message |
| `error.details` | `object?` | Optional additional context (e.g., field errors, required roles) |
| `meta.requestId` | `string` | Request ID for tracing |

### Error Codes

| Code | HTTP Status | Description | Details |
|---|---|---|---|
| `BAD_REQUEST` | 400 | Malformed or invalid request | — |
| `UNAUTHORIZED` | 401 | Authentication required | — |
| `FORBIDDEN` | 403 | Insufficient role permissions | `{ requiredRoles, actualRole }` |
| `NOT_FOUND` | 404 | Resource not found | — |
| `CONFLICT` | 409 | Duplicate or conflict | — |
| `VALIDATION_FAILED` | 422 | Zod schema validation failed | `{ fields: { [path]: string[] } }` |
| `RATE_LIMITED` | 429 | Too many requests | `{ retryAfterSec }` + `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server error | — (details not exposed to clients) |

### Validation Error Details

When `VALIDATION_FAILED` is returned, `error.details.fields` contains field-level errors:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": ["Required"],
        "email": ["Invalid email format"],
        "calories": ["Expected number, received string"]
      }
    }
  },
  "meta": { "requestId": "..." }
}
```

## 2. Rate Limiting

All endpoints are rate-limited. The limit is determined by the `rateLimit` config on each route.

| Preset | Limit | Window | Used For |
|---|---|---|---|
| `auth` | 10 req/min | 60s | Login, signup, OTP |
| `read` | 120 req/min | 60s | GET endpoints |
| `write` | 60 req/min | 60s | POST/PATCH/PUT/DELETE endpoints |

Rate limit headers are not included in responses. When rate-limited, the response includes:
- `Retry-After` header (seconds)
- `error.details.retryAfterSec` field

## 3. Security Headers

All API responses include:
| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

If `CORS_ALLOWED_ORIGINS` is configured:
| Header | Value |
|---|---|
| `Access-Control-Allow-Origin` | Origin (if whitelisted) |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization, X-Cron-Token` |
| `Access-Control-Max-Age` | `86400` |

## 4. Pagination

List endpoints support cursor-based pagination via query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | 25 | Items per page (1–100) |
| `cursor` | `string` | — | Opaque cursor for keyset pagination |
| `page` | `number` | — | Alternative offset-based page number |

Cursor pagination is preferred for large datasets. Cursors are base64url-encoded JSON strings containing the sort key and entity ID.

## 5. Endpoint Inventory

### Orders (`modules/orders`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/orders` | Admin | read | List orders with filters |
| GET | `/api/orders/[orderId]` | Admin | read | Get order detail |
| POST | `/api/orders` | Admin | write | Create new order |
| PATCH | `/api/orders/[orderId]` | Admin | write | Update order |
| GET | `/api/admin/orders/[orderId]/timeline` | Admin | read | Get order timeline |
| POST | `/api/admin/orders/reorder` | Admin | write | Reorder with priority |
| PATCH | `/api/admin/orders/bulk-update` | Admin | write | Bulk update orders |
| PATCH | `/api/admin/orders/delete` | Admin | write | Soft-delete orders |
| PATCH | `/api/admin/orders/restore` | Admin | write | Restore deleted orders |
| PATCH | `/api/admin/orders/permanent-delete` | Admin | write | Permanently delete orders |
| GET | `/api/admin/statistics` | Admin | read | Order statistics |

### Customers (`modules/customers`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/admin/clients` | Admin | read | List customers |
| GET | `/api/admin/clients/[id]` | Admin | read | Get customer detail |
| POST | `/api/admin/clients` | Admin | write | Create customer |
| PATCH | `/api/admin/clients/[id]` | Admin | write | Update customer |
| PATCH | `/api/admin/clients/toggle-status` | Admin | write | Activate/deactivate |
| PATCH | `/api/admin/clients/delete` | Admin | write | Soft-delete |
| PATCH | `/api/admin/clients/restore` | Admin | write | Restore deleted |
| PATCH | `/api/admin/clients/permanent-delete` | Admin | write | Permanent delete |
| PATCH | `/api/admin/clients/bulk-update` | Admin | write | Bulk update |
| GET | `/api/admin/clients/bin` | Admin | read | Recycle bin |
| POST | `/api/admin/clients/run-auto-orders` | Admin | write | Run auto-orders for client |
| GET | `/api/customers` | Admin | read | List customers (admin view) |

### Finance (`modules/finance`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/admin/finance/transaction` | Admin | read | List transactions |
| POST | `/api/admin/finance/transaction` | Admin | write | Create transaction |
| POST | `/api/admin/finance/salary` | Admin | write | Pay salary |
| POST | `/api/admin/finance/buy-ingredients` | Admin | write | Buy ingredients |
| GET | `/api/admin/finance/clients` | Admin | read | Client balances |
| GET | `/api/admin/finance/company` | Admin | read | Company balance |
| GET | `/api/admin/finance/admin-balances` | Admin | read | Salary accrual balances |

### Warehouse (`modules/warehouse`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/admin/warehouse` | Admin | read | Get warehouse point |
| PATCH | `/api/admin/warehouse` | Admin | write | Update warehouse point |
| GET | `/api/admin/warehouse/ingredients` | Admin | read | List ingredients |
| POST | `/api/admin/warehouse/ingredients` | Admin | write | Create ingredient |
| PUT | `/api/admin/warehouse/ingredients` | Admin | write | Update ingredient |
| GET | `/api/admin/warehouse/dishes` | Admin | read | List dishes |
| POST | `/api/admin/warehouse/dishes` | Admin | write | Create dish |
| GET | `/api/admin/warehouse/cooking-plan` | Admin | read | Get cooking plan |
| POST | `/api/admin/warehouse/cooking-plan` | Admin | write | Save cooking plan |
| POST | `/api/admin/warehouse/cook` | Admin | write | Execute cooking |
| GET | `/api/admin/warehouse/inventory` | Admin | read | Get inventory |
| POST | `/api/admin/warehouse/inventory` | Admin | write | Save inventory |

### Chat (`modules/chat`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/chat/conversations` | Admin | read | List conversations |
| POST | `/api/chat/conversations` | Admin | write | Create conversation |
| GET | `/api/chat/messages` | Admin | read | List messages |
| PATCH | `/api/chat/messages` | Admin | write | Mark as read |
| POST | `/api/chat/send` | Admin | write | Send message |
| GET | `/api/chat/users` | Admin | read | List chat users |

### Courier (`modules/courier`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/courier/profile` | Courier | read | Get profile |
| PATCH | `/api/courier/profile` | Courier | write | Update profile |
| GET | `/api/courier/orders` | Courier | read | List assigned orders |
| GET | `/api/courier/next-order` | Courier | read | Get next pending order |
| GET | `/api/courier/stats` | Courier | read | Delivery statistics |
| GET | `/api/courier/route` | Courier | read | Today's route |
| POST | `/api/courier/location` | Courier | write | Update GPS location |
| POST | `/api/courier/withdraw` | Courier | write | Request salary withdrawal |
| POST | `/api/courier/orders/[id]/complete` | Courier | write | Complete delivery |
| POST | `/api/courier/orders/[id]/fail` | Courier | write | Report failed delivery |
| GET | `/api/admin/couriers` | Admin | read | List couriers |
| PATCH | `/api/admin/couriers` | Admin | write | Update courier |
| POST | `/api/admin/couriers` | Admin | write | Create courier |

### Sites (`modules/sites`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/sites/[subdomain]` | Public | — | Get website data |
| POST | `/api/sites/[subdomain]/auth/send-code` | Public | auth | Send OTP code |
| POST | `/api/sites/[subdomain]/auth/verify-code` | Public | auth | Verify OTP code |
| POST | `/api/sites/[subdomain]/auth/login` | Public | auth | Login with password |
| POST | `/api/sites/[subdomain]/auth/register` | Public | auth | Register new account |
| GET | `/api/customers/profile` | Customer | read | Get profile |
| PATCH | `/api/customers/profile` | Customer | write | Update profile |
| GET | `/api/customers/today-menu` | Customer | read | Get today's menu |
| PATCH | `/api/customers/plan` | Customer | write | Toggle meal plan |
| POST | `/api/customers/auth/login` | Public | auth | Customer login |
| POST | `/api/customers/auth/logout` | Customer | write | Logout |
| GET | `/api/customers/orders` | Customer | read | List orders |
| GET | `/api/customers/orders/[id]` | Customer | read | Order detail |
| GET | `/api/admin/website` | Admin | read | Get website settings |
| PUT | `/api/admin/website` | Admin | write | Update website |
| POST | `/api/admin/website/ai-edit` | Admin | write | AI-powered edit |

### Admins (`modules/admins`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/admin/me` | Admin | read | Current admin info |
| PATCH | `/api/admin/profile` | Admin | write | Update own profile |
| PATCH | `/api/admin/profile/change-password` | Admin | write | Change password |
| GET | `/api/admin/low-admins` | Admin | read | List low admins |
| POST | `/api/admin/low-admins` | Admin | write | Create low admin |
| PATCH | `/api/admin/low-admins/[id]` | Admin | write | Update low admin |
| GET | `/api/admin/middle-admins` | Admin | read | List middle admins |
| POST | `/api/admin/middle-admins` | Admin | write | Create middle admin |
| GET | `/api/admin/[adminId]` | Admin | read | Get admin detail |
| PATCH | `/api/admin/[adminId]` | Admin | write | Update admin |
| DELETE | `/api/admin/[adminId]` | Admin | write | Delete admin |
| PATCH | `/api/admin/[adminId]/toggle-status` | Admin | write | Toggle active status |
| PATCH | `/api/admin/[adminId]/password` | Admin | write | Reset password |
| DELETE | `/api/admin/[adminId]/[adminId2]/delete` | Admin | write | Delete admin (alt) |
| PATCH | `/api/admin/[adminId]/[adminId2]/toggle-status` | Admin | write | Toggle status (alt) |
| GET | `/api/admin/users-list` | Admin | read | Users for log filter |
| GET | `/api/admin/action-logs` | Admin | read | Audit logs |
| GET | `/api/admin/features` | Admin | read | List features |
| POST | `/api/admin/features` | Admin | write | Create feature |
| DELETE | `/api/admin/features` | Admin | write | Delete feature |
| GET | `/api/admin/menus` | Admin | read | List menu sets |
| POST | `/api/admin/menus` | Admin | write | Create menu set |
| PATCH | `/api/admin/menus/[id]` | Admin | write | Update menu set |
| DELETE | `/api/admin/menus/[id]` | Admin | write | Delete menu set |
| GET | `/api/admin/sets` | Admin | read | List sets |
| POST | `/api/admin/sets` | Admin | write | Create set |
| PATCH | `/api/admin/sets/[id]` | Admin | write | Update set |
| DELETE | `/api/admin/sets/[id]` | Admin | write | Delete set |
| GET | `/api/admin/live-map` | Admin | read | Live map data |
| POST | `/api/admin/dispatch/start-day` | Admin | write | Start delivery day |
| POST | `/api/admin/dispatch/normalize-drafts` | Admin | write | Normalize draft orders |
| POST | `/api/admin/dispatch/ors-optimize` | Admin | write | Optimize routes (ORS) |
| POST | `/api/admin/dispatch/ors-polyline` | Admin | write | Get route polyline |
| POST | `/api/admin/route-optimize` | Admin | write | Route optimization |
| POST | `/api/admin/auto-orders/create` | Admin | write | Create auto-orders |
| POST | `/api/admin/auto-orders/schedule` | Admin | write | Schedule auto-orders |
| GET | `/api/admin/auto-orders/client` | Admin | read | Client auto-order info |
| GET | `/api/admin/database-snapshot` | Admin | read | Database snapshot |
| POST | `/api/admin/database-import-xlsx` | Admin | write | Import XLSX |
| POST | `/api/admin/database-import-xlsx-all` | Admin | write | Import all XLSX |
| PATCH | `/api/admin/database-row` | Admin | write | Update database row |
| GET | `/api/admin/expand-url` | Admin | read | Expand short URL |
| GET | `/api/admin/scheduler` | Admin | read | Scheduler status |

### Views (BFF)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/admin/views/dashboard` | Admin | read | Dashboard aggregation (BFF) |

### Auth

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/auth/[...nextauth]` | NextAuth | — | NextAuth handler |
| POST | `/api/auth/login` | Public | auth | Admin login |
| POST | `/api/auth/signup` | Public | auth | Admin signup |

### System / Cron

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/health` | Public | — | Health check |
| GET | `/api/cron/scheduler` | Public (cron secret) | — | Run scheduler |
| GET | `/api/cron/check-trials` | Public (cron secret) | — | Check trial expirations |
| GET | `/api/system/auto-scheduler` | Public (cron secret) | — | Auto-scheduler status |
| POST | `/api/system/auto-scheduler` | Admin | write | Run auto-scheduler |
| POST | `/api/ai/chat` | Admin | write | AI chat |

## 6. Auth Types

| Auth Type | Route Factory | Mechanism |
|---|---|---|
| Admin | `createApiRoute` | `getAuthUser(request)` → next-auth session |
| Public | `createPublicApiRoute` | No auth required |
| Customer | `createCustomerApiRoute` | `getCustomerFromRequest(request)` → customerToken cookie |
| Cron | `createPublicApiRoute` + secret check | `X-Cron-Token` header verified against `CRON_SECRET` |
