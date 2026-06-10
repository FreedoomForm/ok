# Architecture — Current State (Post-Refactor)

> Snapshot of the AutoFood codebase after completing the 20-step architecture refactor.

## 1. Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router) |
| Language | TypeScript 5.x |
| Auth | next-auth v5 (Auth.js) + Google OAuth |
| Database | PostgreSQL (Neon serverless) via Prisma 5.22 |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide icons |
| State | Zustand + TanStack Query |
| Realtime | Socket.io |
| Maps | Leaflet + react-leaflet + OpenRouteService |
| AI | Google Gemini, Tambo AI |
| SMS | Textbelt / Infobip / Custom webhook |
| PWA | Custom service worker |
| Charts | Recharts |
| CI/CD | Vercel + GitHub Actions (gitleaks secret scanning) |
| Package Manager | Yarn 4.10 (Plug'n'Play) |
| Validation | Zod (via `modules/shared/validation`) |
| Error Handling | `AppError` hierarchy (via `modules/shared/errors`) |
| Logging | Structured JSON logger (via `modules/shared/logger`) |
| Rate Limiting | In-memory sliding window (via `modules/shared/http/rate-limit`) |
| Audit | `modules/shared/audit` for sensitive action logging |

## 2. Current Directory Structure (simplified)

```
ok/src/
├── app/                    # Next.js App Router
│   ├── api/                # ~95 API route files (all using createApiRoute)
│   │   ├── admin/          # 55+ admin routes (all migrated)
│   │   │   ├── views/      # BFF View API (dashboard aggregation)
│   │   │   ├── finance/    # Finance routes → modules/finance
│   │   │   ├── warehouse/  # Warehouse routes → modules/warehouse
│   │   │   ├── clients/    # Client routes → modules/customers
│   │   │   ├── orders/     # Order routes → modules/orders
│   │   │   ├── couriers/   # Courier routes → modules/courier
│   │   │   ├── website/    # Website routes → modules/sites
│   │   │   └── ...
│   │   ├── auth/           # NextAuth + login/signup (migrated)
│   │   ├── chat/           # Chat routes → modules/chat
│   │   ├── courier/        # Courier routes → modules/courier
│   │   ├── cron/           # Scheduled jobs (migrated)
│   │   ├── customers/      # Customer routes → modules/sites
│   │   ├── sites/          # Multi-tenant routes → modules/sites
│   │   ├── ai/             # AI chat (migrated)
│   │   ├── system/         # Auto-scheduler (migrated)
│   │   ├── orders/         # Order routes → modules/orders
│   │   └── health/         # Health check (migrated)
│   ├── super-admin/        # Super admin pages
│   ├── middle-admin/       # Middle admin pages
│   ├── low-admin/          # Low admin pages
│   ├── courier/            # Courier pages
│   ├── sites/[subdomain]/  # Multi-tenant customer pages
│   └── ...
├── components/
│   ├── admin/              # Admin UI (dashboard, warehouse, orders, finance)
│   ├── auth/               # Auth forms
│   ├── chat/               # Chat UI
│   ├── courier/            # Courier UI
│   ├── layout/             # Shared layout components
│   ├── providers/          # React context providers
│   ├── site/               # Multi-tenant site components
│   ├── smoothui/           # Smooth UI animations
│   ├── tambo/              # Tambo AI components
│   └── ui/                 # 25+ shadcn/ui primitives
├── contexts/               # LanguageContext, AdminSettingsContext
├── features/               # Feature-based modules
│   └── admin-dashboard/    # Shell, tabs, model (extracted from monolith)
│       ├── config/         # Profile UI text, constants
│       ├── hooks/          # useWarehousePoint, useAdminDashboardTab
│       ├── model/          # Types, helpers, constants
│       ├── modals/         # OrderDetailsModal
│       └── shell/          # Dashboard shell (sidebar, topbar, nav)
├── hooks/                  # usePWA, useSiteConfig, useAdminSettings, use-mobile
├── lib/                    # ~30 utility modules (backward-compatible re-exports)
│   ├── admin/              # Admin-specific helpers
│   ├── ai/                 # AI utilities
│   ├── api/                # API helpers
│   ├── tambo/              # Tambo AI utilities
│   ├── auth-utils.ts       # (re-exported from modules/shared/auth)
│   ├── customer-auth.ts    # Customer authentication
│   ├── db.ts               # (re-exported from modules/shared/db)
│   ├── sms-provider.ts     # SMS provider abstraction
│   ├── site-builder.ts     # Website builder utilities
│   ├── translations.ts     # 76KB translation file
│   └── ...
├── modules/                # ✅ Clean Architecture modules (ALL MIGRATED)
│   ├── orders/             # Full module: contracts → infrastructure → application
│   ├── customers/          # Full module: contracts → infrastructure → application
│   ├── finance/            # Full module: contracts → infrastructure → application
│   ├── warehouse/          # Full module: contracts → infrastructure → application
│   ├── chat/               # Full module: contracts → infrastructure → application
│   ├── courier/            # Full module: contracts → infrastructure → application
│   ├── sites/              # Full module: contracts → infrastructure → application
│   ├── admins/             # Full module: contracts → infrastructure → application
│   └── shared/             # Shared infrastructure
│       ├── audit/          # Audit event logging
│       ├── auth/           # Auth utilities (re-exports)
│       ├── db/             # Database client (re-exports)
│       ├── errors/         # AppError hierarchy
│       ├── http/           # createApiRoute, createPublicApiRoute, createCustomerApiRoute
│       │   └── rate-limit.ts  # In-memory rate limiter
│       ├── logger/         # Structured JSON logger + request ID
│       └── validation/     # Zod helpers, cursor pagination, input sanitization
├── types/                  # Global TypeScript types
├── views/                  # BFF View API aggregation
│   └── dashboard.view.ts   # Dashboard BFF (replaces 5-8 API calls)
├── auth.ts                 # NextAuth v5 config
├── auth.config.ts
└── middleware.ts           # Next.js middleware (auth, subdomain routing)
```

## 3. Key Improvements (vs. Baseline)

### 3.1. Monolith Component → Modular
- `AdminDashboardPage.tsx` reduced from ~4100 → ~1500 lines (63% reduction)
- Shell, tabs, modals, hooks, helpers, types, and config all extracted
- Lazy loading for heavy tabs (ChatCenter, AdminsTab, etc.)

### 3.2. All API Routes on `createApiRoute`
- All ~95 API route files now use `createApiRoute`, `createPublicApiRoute`, or `createCustomerApiRoute`
- Consistent response format: `{ data: ..., meta: { requestId } }`
- Consistent error format: `{ error: { code, message }, meta: { requestId } }`
- Built-in auth check, role-based authorization, rate limiting, request ID tracing
- Slow request logging (>500ms)

### 3.3. Clean Architecture Modules
- 9 fully migrated modules with `contracts/ → infrastructure/ → application/` layers
- 80+ typed DTOs prevent Prisma types from leaking to API consumers
- Prisma select presets prevent `SELECT *` data leaks
- Repository pattern encapsulates all database access
- Application layer enforces role-based scoping on all queries/commands

### 3.4. N+1 Queries Fixed
- Customer list uses Prisma `include` with select presets for batch loading
- Courier list uses batch loading for related admin data
- Dashboard View API aggregates data server-side (eliminates 5-8 frontend calls)

### 3.5. CI/CD Pipeline
- GitHub Actions workflow for gitleaks secret scanning
- Custom `.gitleaks.toml` rules for Firebase service accounts, SMS tokens, API keys
- `.env.example` with generation hints and provider links

### 3.6. Full Observability
- Structured JSON logging with `requestId`, `userId`, `durationMs`
- Request ID generation (nanoid-based) on every API request
- Slow request logging (>500ms)
- Audit logging for dangerous actions (admin CRUD, financial ops, role changes, password resets)

## 4. API Route Inventory (Post-Refactor)

| Domain | Route Count | Status | Module |
|---|---|---|---|
| Admin (orders) | 8 | ✅ Migrated | `modules/orders` |
| Admin (clients) | 8 | ✅ Migrated | `modules/customers` |
| Admin (finance) | 6 | ✅ Migrated | `modules/finance` |
| Admin (warehouse) | 6 | ✅ Migrated | `modules/warehouse` |
| Admin (couriers) | 1 | ✅ Migrated | `modules/courier` |
| Admin (website) | 2 | ✅ Migrated | `modules/sites` |
| Admin (users/admins) | 8 | ✅ Migrated | `modules/admins` |
| Admin (misc) | 12 | ✅ Migrated | Various (sets, features, menus, dispatch, etc.) |
| Admin (views) | 1 | ✅ New | `views/dashboard.view.ts` |
| Auth | 3 | ✅ Migrated | `modules/admins` + NextAuth |
| Customers | 8 | ✅ Migrated | `modules/sites` + `modules/customers` |
| Courier | 9 | ✅ Migrated | `modules/courier` |
| Chat | 4 | ✅ Migrated | `modules/chat` |
| Sites | 5 | ✅ Migrated | `modules/sites` |
| Cron | 2 | ✅ Migrated | Standalone |
| AI | 1 | ✅ Migrated | Standalone |
| System | 1 | ✅ Migrated | Standalone |
| Health | 1 | ✅ Migrated | Standalone |
| Orders | 2 | ✅ Migrated | `modules/orders` |
| **Total** | **~95** | **All migrated** | |

## 5. Module Migration Status

| Module | Status | Files | Key DTOs | Key Queries | Key Commands |
|---|---|---|---|---|---|
| `modules/orders/` | ✅ Complete | 16 | OrderListItem, OrderDetail, OrderTimelineEvent, OrderStats, OrderListFilters | list-orders, get-order-detail, get-order-stats, get-order-timeline | create-order, update-status, archive, reorder, bulk-update, soft-delete, restore, permanent-delete |
| `modules/customers/` | ✅ Complete | 15 | CustomerListItem, CustomerDetail, CustomerBinItem, CustomerSummary, CreateCustomerData, UpdateCustomerData | list-customers, get-customer-detail | create-customer, update-customer, toggle-status, soft-delete, restore, permanent-delete, bulk-update |
| `modules/finance/` | ✅ Complete | 12 | TransactionListItem, TransactionDetail, CompanyBalance, AdminBalanceResult, FinanceClientSummary, BuyIngredientsData | list-transactions, get-admin-balances, get-company-balance, get-finance-clients | create-transaction, pay-salary, buy-ingredients |
| `modules/warehouse/` | ✅ Complete | 14 | WarehouseItemDTO, DishDTO, CookingPlanDTO, CookResult, InventoryDTO, WarehousePointDTO | list-ingredients, list-dishes, get-cooking-plan, get-warehouse | create-ingredient, update-ingredient, create-dish, cook, update-warehouse |
| `modules/chat/` | ✅ Complete | 14 | ChatUserDTO, ConversationDTO, MessageDTO, RawConversationDTO, SendMessageData | list-conversations, list-messages, list-chat-users | send-message, create-conversation, mark-messages-read |
| `modules/courier/` | ✅ Complete | 17 | CourierProfileDTO, CourierOrderDTO, NextOrderDTO, CourierStatsDTO, AdminCourierDTO, WithdrawResult | get-courier-profile, list-courier-orders, get-next-order, get-courier-stats, get-courier-route, list-admin-couriers | update-location, update-profile, complete-order, fail-order, request-withdraw, admin-update-courier, admin-create-courier |
| `modules/sites/` | ✅ Complete | 15 | WebsiteDTO, AdminWebsiteSettingsDTO, CustomerProfileDTO, SiteAuthResult, TodayMenuDTO, AiEditResult | get-site, get-customer-profile, get-today-menu, get-customer-plan | update-site, site-login, site-register, site-send-code, site-verify-code, customer-logout |
| `modules/admins/` | ✅ Complete | 16 | AdminDTO, AdminListItem, AdminDetail, CreateAdminData, ActionLogDTO, LiveMapData, OrsOptimizeResult | get-current-admin, list-admins, get-admin-detail, list-users | create-admin, update-admin, create-middle-admin, update-middle-admin, delete-admin, toggle-admin-status, change-password, reset-password, update-profile |
| `modules/shared/` | ✅ Complete | 10 | AuthUser, PaginationInput, AuditEventInput | — | — |

## 6. Security Posture (After Refactor)

| Area | Before | After |
|---|---|---|
| Auth | next-auth v5 + Google OAuth (working) | Same + role-based scoping on all routes |
| Secret scanning | None | GitHub Actions gitleaks on push/PR |
| `.env.example` | Exists with all 30+ vars documented | Improved with section headers + generation hints |
| `.gitignore` secrets | Partial | Full: `*.pem`, `credentials*`, `service-account*.json`, `secrets/`, `.secrets` |
| Input validation | Ad-hoc in individual routes | Zod validation on all routes via `validate`/`validateBody`/`validateSearchParams` |
| Input sanitization | None | Auto-sanitize (trim + null byte strip) on all `validateBody` calls |
| Rate limiting | None | 3 presets: auth (10/min), read (120/min), write (60/min) |
| Audit logging | Minimal (action-logs endpoint) | Full audit trail for admin CRUD, financial ops, role changes, password resets |
| CORS | Default Next.js | Configurable allowed origins + security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) |
| Request ID | None | Nanoid-based requestId on all API responses |
| Error exposure | Raw Prisma errors possible | AppError hierarchy ensures safe error responses (no internal details leaked) |
| SELECT * | Common in inline routes | All routes use Prisma select presets |
| Slow request detection | None | Logged when >500ms |

## 7. Response Format Standards

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "requestId": "abc123"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found: clx123"
  },
  "meta": {
    "requestId": "abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate/conflict |
| `VALIDATION_FAILED` | 422 | Zod validation failed (includes field-level errors) |
| `RATE_LIMITED` | 429 | Too many requests (includes `Retry-After` header) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
