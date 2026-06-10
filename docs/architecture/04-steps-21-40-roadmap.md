# Steps 21-40 Roadmap — Deep Compliance & Production Readiness

> Extends the 20-step architecture refactor to fully comply with the Backend, DB, and Frontend Design System documents.

## Current State After Steps 1-20

| Metric | Before (Step 0) | After (Step 20) |
|---|---|---|
| API routes using createApiRoute | 0 / ~95 | ~95 / ~95 |
| Clean Architecture modules | 0 | 9 (orders, customers, finance, warehouse, chat, courier, sites, admins, shared) |
| DTO types | 0 | 80+ |
| AdminDashboardPage lines | ~4100 | ~1500 |
| Dashboard initial API calls | 5-8 | 1 (View API) |
| Request ID tracing | None | ✅ |
| Rate limiting | None | ✅ (in-memory) |
| Structured logging | None | ✅ |
| Audit logging | Minimal | ✅ |
| Input sanitization | None | ✅ |
| CORS hardening | Default | ✅ |
| Module READMEs | 0 | 9 |
| ADRs | 0 | 4 |

## Remaining Gaps (from Design System Requirements)

### Backend Design System Gaps
1. **`src/lib/` still exists** — modules import from `@/lib/` instead of `@/modules/shared/`
2. **No domain layer** — modules have contracts/infrastructure/application but no `domain/` sublayer (entities, policies, events)
3. **No outbox pattern** — `outbox_events` table exists but no worker publishes events
4. **No batch endpoints** — design system requires `POST /resources:batch-get`
5. **No API versioning** — design system requires `/api/v1/` prefix
6. **No read models** — heavy dashboard queries still compute aggregates on every request
7. **No tests** — design system requires unit/integration/contract/e2e tests
8. **No OpenAPI spec** — Step 20 created markdown docs but no machine-readable spec
9. **No caching** — design system requires L0-L4 caching strategy
10. **No async jobs** — heavy operations (export, report) still synchronous

### DB Design System Gaps
1. **SELECT * still exists** in some warehouse/finance routes
2. **No cursor pagination** on most list endpoints (only schema added, not enforced)
3. **No query contracts** (YAML files per the DB design system)
4. **No index audit** — indexes not verified against access patterns
5. **No read replicas** configured
6. **No partitioning** for `order_audit_events`, `action_logs`, `messages`
7. **No data lifecycle/retention** policies
8. **No backup/restore test** automation
9. **Prisma select presets** not enforced (some routes still use `include: true`)

### Frontend Design System Gaps
1. **No borderless UI** compliance — components still use borders
2. **No design tokens** enforcement — hardcoded values in many components
3. **No loading/empty/error states** for all screens
4. **No WCAG AA** audit
5. **AdminDashboardPage still ~1500 lines** — needs further decomposition
6. **No shared API client** — raw `fetch()` calls scattered across components

---

## Phase 6: lib/ Deprecation & Import Migration (Steps 21-23)

### Step 21: Create `modules/shared/` equivalents for all `lib/` modules
**Status: PENDING**
- Move `lib/admin-scope.ts` → `modules/shared/auth/admin-scope.ts`
- Move `lib/safe-json.ts` → `modules/shared/validation/safe-json.ts`
- Move `lib/roles.ts` → `modules/shared/auth/roles.ts`
- Move `lib/rate-limit.ts` → `modules/shared/http/rate-limit.ts` (already done)
- Move `lib/order-audit.ts` → `modules/orders/infrastructure/order-audit.ts`
- Move `lib/otp-store.ts` → `modules/sites/infrastructure/otp-store.ts`
- Move `lib/sms-provider.ts` → `modules/sites/infrastructure/sms-provider.ts`
- Move `lib/site-builder.ts` → `modules/sites/infrastructure/site-builder.ts`
- Move `lib/site-urls.ts` → `modules/sites/infrastructure/site-urls.ts`
- Move `lib/subdomain-host.ts` → `modules/sites/infrastructure/subdomain-host.ts`
- Move `lib/customer-auth.ts` → `modules/sites/infrastructure/customer-auth.ts`
- Move `lib/geo.ts` → `modules/shared/geo/index.ts`
- Move `lib/menuData.ts` → `modules/warehouse/infrastructure/menu-data.ts`
- Move `lib/browser-storage.ts` → `modules/shared/browser-storage/index.ts`
- Move `lib/api-client.ts` → `modules/shared/http/api-client.ts`
- Move `lib/validations.ts` → `modules/shared/validation/validations.ts`
- Create re-export stubs in `lib/` for backward compatibility

### Step 22: Update all module imports to use `@/modules/shared/`
**Status: PENDING**
- Replace all `@/lib/db` imports with `@/modules/shared/db` in module files
- Replace all `@/lib/auth-utils` imports with `@/modules/shared/auth` in module files
- Replace all `@/lib/admin-scope` imports with `@/modules/shared/auth/admin-scope`
- Replace all `@/lib/safe-json` imports with `@/modules/shared/validation/safe-json`
- Update ~71 module files

### Step 23: Update frontend imports + deprecate `lib/`
**Status: PENDING**
- Update `features/`, `components/`, `views/` to import from `@/modules/shared/` instead of `@/lib/`
- Update ~35 frontend files
- Mark `lib/` as deprecated with JSDoc `@deprecated` tags
- Keep `lib/` as re-export stubs only (thin layer forwarding to modules/shared)
- Move `lib/translations.ts` → keep in place (too large, referenced everywhere)
- Move `lib/ai/` → keep in place (Tambo AI integration, not a domain module)

---

## Phase 7: Domain Layer & Events (Steps 24-27)

### Step 24: Add `domain/` sublayer to each module
**Status: PENDING**
For each module (orders, customers, finance, warehouse, chat, courier, sites, admins):
- Create `modules/{name}/domain/` directory
- Create `{name}.entity.ts` — domain entity with business rules (e.g., Order entity with status transition rules)
- Create `{name}.policy.ts` — authorization policies (e.g., OrderPolicy.canChangeStatus(user, order))
- Create `{name}.errors.ts` — domain-specific error codes
- Create `{name}.events.ts` — domain event types (e.g., OrderCreated, OrderStatusChanged)
- Move business validation rules from application/commands into domain entities

### Step 25: Implement outbox pattern for domain events
**Status: PENDING**
- Create `modules/shared/events/outbox-writer.ts` — writes events to `outbox_events` table within the same DB transaction
- Create `modules/shared/events/outbox-publisher.ts` — reads unpublished events and processes them
- Create `modules/shared/events/event-handlers.ts` — registry of event handlers (e.g., `order.created` → update customer stats, send notification)
- Wire domain events from commands: after `createOrder`, write `OrderCreated` event to outbox
- Add cron endpoint to process outbox events

### Step 26: Add batch endpoints
**Status: PENDING**
Per the Backend Design System (Section 15 — Batching):
- `POST /api/v1/customers:batch-get` — fetch multiple customers by IDs
- `POST /api/v1/admins:batch-get` — fetch multiple admins by IDs
- `POST /api/v1/orders:batch-get` — fetch multiple orders by IDs
- Add `BatchGetInput` and `BatchGetResult` types to shared contracts
- Max batch size: 100 IDs

### Step 27: Add API versioning prefix
**Status: PENDING**
Per the Backend Design System (Section 4.1):
- Add `/api/v1/` prefix to all routes
- Keep `/api/` as backward-compatible redirect (301) to `/api/v1/`
- Update frontend API client to use `/api/v1/` prefix
- Update middleware.ts to handle versioned routes
- Add `API_VERSION` constant to `modules/shared/http/`

---

## Phase 8: Performance & Caching (Steps 28-31)

### Step 28: Implement read models for dashboard stats
**Status: PENDING**
Per the DB Design System (Section 16):
- Create `daily_order_stats` materialized view / table
- Create `admin_dashboard_counters` table
- Add background aggregation cron job (runs every 5 min)
- Update `executeGetOrderStats` to read from materialized view instead of computing on every request
- Add `getOrderStats` read model repository

### Step 29: Add application-level caching
**Status: PENDING**
Per the Backend Design System (Section 14):
- Create `modules/shared/cache/` with in-memory cache (Map with TTL)
- Add cache decorators/wrappers for repository functions
- Cache strategy by priority:
  - B0 (admin info, permissions): 15s TTL
  - B1 (order lists, stats): 30s TTL
  - B2 (audit logs, messages): 60s TTL
  - B3 (reports, exports): no cache, or 300s TTL
- Cache invalidation: on write commands, invalidate related cache keys
- Add cache key format: `{env}:{module}:{resource}:{id}:{version}:{fieldsHash}:{userOrTenantScope}`

### Step 30: Add async job infrastructure
**Status: PENDING**
Per the Backend Design System (Section 16):
- Create `modules/shared/jobs/` directory
- Create `job.repository.ts` — CRUD for job records (id, type, status, progress, result, error)
- Create `job.executor.ts` — processes jobs with retry logic and exponential backoff
- Add `POST /api/v1/jobs` — create job
- Add `GET /api/v1/jobs/:id` — get job status
- Migrate heavy operations to async jobs:
  - Database import/export
  - Route optimization (ORS)
  - Auto-orders generation
  - Monthly report generation

### Step 31: Enforce cursor pagination on all list endpoints
**Status: PENDING**
Per the DB Design System (Section 12):
- Add cursor pagination to all list queries that don't have it yet
- Default limit: 25, max limit: 100
- Return `{ data: [...], meta: { nextCursor, hasMore } }`
- Use stable sort (updatedAt DESC, id DESC) with seek pagination
- Add `buildCursorFilter()` usage to all repository list functions
- Remove any remaining OFFSET-based pagination

---

## Phase 9: Testing & Quality (Steps 32-35)

### Step 32: Add unit tests for domain layer
**Status: PENDING**
Per the Backend Design System (Section 20):
- Test all domain entities (status transition rules, validation)
- Test all domain policies (authorization rules)
- Test all transformers (Prisma row → DTO mapping)
- Use Vitest or Jest as test runner
- Target: 80% coverage on domain layer
- Focus on: Order status transitions, Customer creation rules, Finance balance calculations

### Step 33: Add integration tests for repositories
**Status: PENDING**
- Test all repository functions against a test database
- Use Prisma's test database or Docker PostgreSQL
- Test: listOrders with filters, createOrder, customer CRUD, finance transactions
- Verify select presets return correct fields (no SELECT *)
- Verify role-based scoping works correctly
- Target: key repository functions for each module

### Step 34: Add contract tests for API routes
**Status: PENDING**
- Test all API routes return correct `{ data, meta }` format
- Test all error responses return correct `{ error: { code, message }, meta }` format
- Test rate limiting returns 429
- Test authentication returns 401
- Test authorization returns 403
- Test validation returns 422 with field-level errors
- Use supertest or similar for HTTP testing

### Step 35: Add E2E smoke tests
**Status: PENDING**
- Playwright tests for critical user flows:
  - Admin login → dashboard loads
  - Create order → appears in list
  - Create customer → appears in list
  - Finance transaction → balance updates
  - Courier completes order → status changes
- Run in CI pipeline
- Target: 5-10 critical paths

---

## Phase 10: Frontend Compliance (Steps 36-38)

### Step 36: Decompose AdminDashboardPage further
**Status: PENDING**
Per the Frontend Design System:
- Extract remaining inline modals (create courier, change password) to separate components
- Target: AdminDashboardPage under 500 lines (currently ~1500)
- Create dedicated components for:
  - CourierCreateModal
  - PasswordChangeModal
  - OrderCreateModal
  - ClientCreateModal
  - DispatchPanel (map + controls)

### Step 37: Apply borderless UI + design tokens
**Status: PENDING**
Per the Frontend Design System v2.0:
- Remove visible borders from cards, panels, table cells
- Replace with whitespace + background tint separation
- Replace all hardcoded spacing values with CSS custom properties (--space-*)
- Replace all hardcoded colors with CSS custom properties (--color-*)
- Apply borderless table styles (only horizontal separators, no vertical borders)
- Apply borderless card styles (no border, no shadow, background tint)
- Apply borderless input styles (bottom-border or background tint, no box outline)

### Step 38: Add missing UI states
**Status: PENDING**
Per the Frontend Design System (Section 11):
- Add loading skeleton states for all data-fetching components
- Add empty state messages for all list/table views
- Add error state displays for all data-fetching components
- Add success/error toast notifications for all mutations
- Add disabled state explanations for all disabled buttons
- Verify all states: Default, Hover, Focus, Active, Selected, Disabled, Loading, Empty, Error, Success

---

## Phase 11: Production Readiness (Steps 39-40)

### Step 39: Database optimization & lifecycle
**Status: PENDING**
Per the DB Design System:
- Add missing indexes based on access pattern analysis
- Verify all composite indexes start with tenant column (adminId/createdBy)
- Add partial indexes for active data (WHERE deleted_at IS NULL)
- Configure read replica for reporting queries
- Set up data retention policies (hot/warm/cold)
- Add partitioning for `order_audit_events` (by month)
- Add partitioning for `action_logs` (by month)
- Add backup restore test automation (monthly)
- Document all query contracts in `db/access-patterns/`

### Step 40: CI/CD pipeline + deployment automation
**Status: PENDING**
- Add GitHub Actions workflow for:
  - Lint + typecheck on PR
  - Unit tests on PR
  - Integration tests on merge to main
  - Build verification before deploy
- Add Vercel preview deployments for PRs
- Add database migration CI check
- Add performance budget checks (bundle size, LCP, CLS, INP)
- Add security scanning (gitleaks, npm audit, Snyk)
- Add deployment runbook documentation
- Add monitoring/alerting integration (Sentry, DataDog, or similar)

---

## Summary: Steps 21-40 by Phase

| Phase | Steps | Focus | Estimated Effort |
|---|---|---|---|
| 6: Import Migration | 21-23 | lib/ → modules/shared/ deprecation | Medium |
| 7: Domain & Events | 24-27 | Domain layer, outbox, batch, versioning | High |
| 8: Performance | 28-31 | Read models, caching, async jobs, pagination | High |
| 9: Testing | 32-35 | Unit, integration, contract, E2E tests | High |
| 10: Frontend | 36-38 | Decomposition, borderless UI, states | Medium |
| 11: Production | 39-40 | DB optimization, CI/CD pipeline | Medium |

## Principles (same as Steps 1-20)

1. **Each step is independently deployable** — no step requires a later step to be functional
2. **Strangler Fig** — new code coexists with old; migration is gradual
3. **Build must pass after every step** — never leave the project in a broken state
4. **Preserve existing API contracts** — frontend should not break during refactor
5. **Measure before optimizing** — add observability first, then fix bottlenecks
