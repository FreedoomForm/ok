# 20-Step Architecture Refactor Roadmap

> Strangler Fig approach — each step is independently deployable. No big-bang rewrite.

## Phase 1: Safety & Extraction (Steps 1-5)

### Step 1: Secret rotation + gitleaks CI + .env.example + baseline docs
**Status: DONE**
- [x] `.github/workflows/gitleaks.yml` — GitHub Action for secret scanning on push/PR
- [x] `.gitleaks.toml` — Custom rules for Firebase service accounts, SMS tokens, API keys
- [x] `.gitignore` — Added `credentials*`, `service-account*.json`, `secrets/`, `.secrets`
- [x] `docs/architecture/00-current-state.md` — Baseline snapshot
- [x] `docs/architecture/01-refactor-roadmap.md` — This file

### Step 2: Extract constants/types/helpers from AdminDashboardPage
**Status: DONE**
- [x] Move all TypeScript interfaces/types to `features/admin-dashboard/model/` (OrderTimelineEvent, ClientFinanceEntry, ClientFinanceById)
- [x] Move pure helper functions to `features/admin-dashboard/model/admin-dashboard.helpers.ts` (getDateLocale, getClientGroupOptions)
- [x] Re-export through barrel `features/admin-dashboard/model/index.ts`
- [x] Verify build still passes after each extraction
- [ ] Move remaining constants (status maps, color maps, tab configs) to `features/admin-dashboard/config/` (future iteration)

### Step 3: Extract dashboard shell (sidebar, topbar, nav, role guard)
**Status: DONE**
- [x] Create `features/admin-dashboard/shell/` directory
- [x] Extract `<AdminDashboardShell>` with sidebar, topbar, navigation
- [x] Extract role guard logic (super/middle/low admin permissions)
- [x] `AdminDashboardPage` renders `<AdminDashboardShell>` + active tab content

### Step 4: Extract tabs and modals
**Status: PARTIAL**
- [x] Extract `features/admin-dashboard/tabs/StatisticsTab` (done)
- [x] Extract `features/admin-dashboard/tabs/OrdersTab` (done)
- [x] Extract `features/admin-dashboard/tabs/ClientsTab` (done)
- [x] Extract `features/admin-dashboard/tabs/BinTab` (done)
- [x] Extract `features/admin-dashboard/modals/OrderDetailsModal` (done, 219 lines extracted)
- [x] Extract `components/admin/dashboard/tabs-content/AdminsTab` (done)
- [ ] Extract `features/admin-dashboard/tabs/overview/` with its own component + hooks
- [ ] Extract remaining inline modals (create courier, change password)

### Step 5: Lazy load heavy tabs
**Status: DONE**
- [x] Wrap each tab in `next/dynamic` (with ssr: false)
- [x] Add loading skeletons for each tab
- [x] Only active tab + overview are eagerly loaded

## Phase 2: Shared Infrastructure (Steps 6-7)

### Step 6: Add shared HTTP route wrapper (`createApiRoute`)
**Status: DONE**
- [x] Create `modules/shared/http/create-api-route.ts` + `createPublicApiRoute`
- [x] Standardizes: try/catch, auth check, response format, error codes
- [x] Create `modules/shared/errors/` with typed error classes (AppError, NotFound, Forbidden, etc.)
- [x] Create `modules/shared/validation/` with Zod schema helpers (validate, validateBody, validateSearchParams)
- [ ] Migrate 2-3 routes as proof of concept

### Step 7: Fill `modules/shared/` scaffolded directories
**Status: DONE**
- [x] `modules/shared/auth/` — Re-exports `getAuthUser`, `hasRole`, `canModifyAdmin` from `@/lib/auth-utils`
- [x] `modules/shared/db/` — Re-exports `db` from `@/lib/db`
- [x] `modules/shared/logger/` — Structured JSON logger with requestId, userId
- [x] `modules/shared/validation/` — Zod `validate`, `validateBody`, `validateSearchParams` + common schemas
- [x] `modules/shared/errors/` — `AppError`, `NotFound`, `Forbidden`, `ValidationFailed`, etc.

## Phase 3: Orders Module (Steps 8-10)

### Step 8: Migrate orders queries to Clean Architecture
**Status: DONE**
- [x] `modules/orders/contracts/` — Order DTOs (OrderListItem, OrderDetail, OrderTimelineEvent, OrderStats, OrderListFilters)
- [x] `modules/orders/infrastructure/` — Order repository with Prisma select presets (no SELECT *)
- [x] `modules/orders/application/queries/` — `list-orders`, `get-order-detail`, `get-order-stats`, `get-order-timeline`
- [x] Wire up to existing API routes via `createApiRoute` (GET /api/orders, GET /api/orders/[orderId], GET /api/admin/statistics, GET /api/admin/orders/[orderId]/timeline)
- [x] Update frontend consumers for new `{ data: ... }` response format (useDashboardData, AdminDashboardPage)

### Step 9: Add View API for admin dashboard overview
- [ ] `src/views/dashboard.view.ts` — Aggregates B0/B1 data for dashboard
- [ ] `GET /api/admin/views/dashboard?sections=overview,stats`
- [ ] Replaces 5-8 separate frontend calls with one View API call
- [ ] Priority-based sections: B0 (admin info, permissions), B1 (stats, today orders)

### Step 10: Migrate orders commands + customer queries + fix N+1
- [ ] `modules/orders/application/commands/` — `create-order`, `update-status`, `archive`
- [ ] `modules/customers/application/queries/` — `list-customers`, `get-customer-detail`
- [ ] Fix N+1 in customer list (batch load related orders)
- [ ] Add cursor pagination to list endpoints

## Phase 4: Remaining Modules (Steps 11-16)

### Step 11: Finance module migration
- [ ] `modules/finance/` — transactions, salary, company balances, buy-ingredients
- [ ] Extract from `api/admin/finance/*` routes

### Step 12: Warehouse module migration
- [ ] `modules/warehouse/` — inventory, dishes, ingredients, cooking-plan, cook
- [ ] Extract from `api/admin/warehouse/*` routes

### Step 13: Chat module migration
- [ ] `modules/chat/` — conversations, messages, send
- [ ] Wire Socket.io events through application layer

### Step 14: Courier module migration
- [ ] `modules/courier/` — location, orders, stats, route optimization
- [ ] Extract from `api/courier/*` routes

### Step 15: Sites / multi-tenant module
- [ ] `modules/sites/` — subdomain CRUD, site auth, website builder
- [ ] Consolidate site-related logic from `lib/site-builder.ts`

### Step 16: Admin management module
- [ ] `modules/admins/` — CRUD admins, roles, permissions
- [ ] `modules/auth/` — login, signup, password management

## Phase 5: Cleanup & Polish (Steps 17-20)

### Step 17: Shared module cleanup — deprecate `src/lib/`
- [ ] Move remaining `lib/` utilities into appropriate `modules/shared/` directories
- [ ] Create re-export stubs in `lib/` for backward compatibility
- [ ] Update all imports across codebase

### Step 18: Add request ID tracing + structured logging
- [ ] `modules/shared/logger/` — JSON logger with requestId, userId, durationMs
- [ ] Add request ID middleware to `createApiRoute`
- [ ] Log slow queries (>150ms) and slow requests (>500ms)

### Step 19: Add rate limiting + security middleware
- [ ] Rate limiting per endpoint category (auth: strict, read: moderate, write: moderate)
- [ ] CORS hardening
- [ ] Input sanitization on all routes
- [ ] Audit log for dangerous actions (delete, role change, financial ops)

### Step 20: Documentation + API contracts
- [ ] Generate OpenAPI spec from Zod schemas
- [ ] Write module READMEs for each migrated module
- [ ] Update `docs/architecture/` with final state
- [ ] Add ADR (Architecture Decision Records) for key choices

## Principles

1. **Each step is independently deployable** — no step requires a later step to be functional
2. **Strangler Fig** — new code coexists with old; migration is gradual
3. **Build must pass after every step** — never leave the project in a broken state
4. **Preserve existing API contracts** — frontend should not break during refactor
5. **Measure before optimizing** — add observability first, then fix bottlenecks
