# Engineering Improvement Report

## Executive summary

The repository `ozodbekasilbekov2-gif/ok` is a Next.js 15 / React 19 / TypeScript / Prisma delivery-management platform with customer websites, admin roles, courier workflows, orders, warehouse, finance, routing, chat, AI integrations, and generated Tambo catalogs.

The first improvement pass deliberately avoids a rewrite. It strengthens the highest-leverage seams that were visible from the audit: order-query scalability, dashboard refresh reliability, deployment change safety, database access paths, production error recovery, and measurable verification. The large admin UI modules remain intact; the changes introduce narrow interfaces around them so future refactors can be incremental.

## Repository map and main hotspots

The repository contains 475 tracked files and 323 TypeScript/TSX source files. There are 99 API route files. The principal domain boundaries are:

| Boundary | Current surface | Main audit finding |
|---|---|---|
| Identity and roles | NextAuth + JWT fallback, middleware, role helpers | Role/path policy is duplicated; JWT claims are not revalidated against the current admin record or `isActive`. |
| Orders and dispatch | `Order`, `OrderAuditEvent`, order routes, courier routes, dispatch map | The order GET route previously loaded all matching rows and applied date/status/payment filters in JavaScript. |
| Customer/admin scope | `admin-scope.ts`, customer/order routes | Scope logic is reusable but repeated route-level policy remains broad and should eventually become a single authorization service. |
| Dashboard UI | `AdminDashboardPage.tsx` (4,156 LOC), `useDashboardData.ts` | One hook coordinated permissions, five primary requests, two bin requests, timeout handling, and mutable resource state. |
| Warehouse/menu/finance | Large tabs and Prisma models | Functionality is broad, but module size and `any` usage make regression risk and memory behavior difficult to measure. |
| Deployment | Next build, Prisma generate, Vercel db-push helper, CI/nightly workflows | Production build could mutate schema by default; typecheck/lint were not aligned with the actual Next runtime graph. |

The quality report identifies the largest files as `AdminDashboardPage.tsx` (4,156 LOC), `src/lib/tambo/tools.ts` (2,266), `SetsTab.tsx` (2,228), generated/menu data files, the database page (1,786), `WarehouseTab.tsx` (1,473), and the dispatch map (1,381). These are refactor candidates, not targets for a risky one-shot rewrite.

## Professional references and applicable lessons

| Reference | What it contributes | How it applies here |
|---|---|---|
| [Enatega](https://github.com/enatega/food-delivery-multivendor) | Domain reference for multi-vendor delivery with distinct customer, rider, vendor, admin, analytics, tracking, chat, payments, and error-monitoring surfaces. | Preserve explicit role/product surfaces and order lifecycle boundaries; do not copy its React Native/GraphQL/Mongo stack. |
| [Medusa](https://github.com/medusajs/medusa) | Architecture reference for modular commerce primitives, integrations, packages, tests, and replaceable modules. | Deepen orders, inventory, payments, and external integrations behind narrow interfaces rather than expanding route handlers. |
| [TastyIgniter](https://github.com/tastyigniter/TastyIgniter) | Restaurant-domain reference with ordering, reservations, management, themes, extensions, tests, and security-hardening history. | Treat customer site/theme, restaurant operations, back-office, and extensions as explicit boundaries. |
| [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist) | Framework-specific checklist for performance, caching, errors, security, observability, and deployment. | Use it as a release checklist against the real repository, especially for build/database coupling and route error handling. |

## Metrics framework

The project should measure trends at application level rather than chase arbitrary universal targets.

| Area | Metric / target | Initial instrumentation path |
|---|---|---|
| Customer-site performance | Core Web Vitals: LCP ≤ 2.5 s, INP < 200 ms, CLS < 0.1 at the 75th percentile | Real-user web-vitals collection for public sites and top admin routes; Lighthouse/Playwright for repeatable checks. |
| API reliability | Availability, error rate, p50/p95/p99 latency for login, order creation, order list, dispatch, courier status | Request timing and status metrics, eventually OpenTelemetry-compatible traces/metrics/log correlation. |
| DB performance | p95 order-list latency, query duration, rows returned, slow-query count, connection errors | Prisma query instrumentation and DB-side query plans; do not infer DB speed from total page time alone. |
| Order correctness | Order creation success rate, duplicate order-number conflicts, audit-event write failures, payment/order consistency failures | Domain counters and explicit audit/transaction error monitoring. |
| UI quality | Keyboard/focus/contrast and WCAG 2.2 AA checks for critical flows; error-boundary recovery rate | Playwright + axe checks and route-level error telemetry. |
| Security | Scoped OWASP ASVS 5.0.0 checklist coverage for auth, authorization, validation, encoding, secrets, and session handling | Versioned checklist mapped to routes and role tests. |
| Delivery | DORA change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate | GitHub/Vercel/incident records at this application level; use trends and avoid gaming. |
| Memory and bundle | First Load JS by route, heap growth over repeated dashboard refreshes, detached DOM/listener growth | Next build budget report plus browser performance profiles on the dashboard/courier flows. |

Official sources: [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals), [Google SRE SLOs](https://sre.google/sre-book/service-level-objectives/), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/), [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), and [DORA metrics](https://dora.dev/guides/dora-metrics/).

## Baseline evidence

| Check | Baseline |
|---|---:|
| TypeScript errors before production-graph correction | 27, primarily legacy Vite/demo entrypoints included by the root `tsconfig` |
| Direct TypeScript compiler after scoped `tsconfig` correction | 0 errors |
| Full lint warnings before changes | 672 warnings, 0 errors |
| Lint on changed files | 19 warnings, 0 errors |
| Unit tests added for order query seam | 3 passing |
| Next build | Compiled successfully; 97/97 static pages generated |
| Existing bundle snapshot | Shared First Load JS 103 kB; `/super-admin` 479 kB; `/courier` 465 kB |
| Largest production admin module | `AdminDashboardPage.tsx`, 4,156 LOC |
| Existing API route count | 99 |

The build still emits an existing Edge Runtime warning caused by `bcryptjs` through `src/auth.ts`; this was not changed in the first pass because it requires an explicit runtime-boundary decision rather than a blind import rewrite.

## Implemented changes

### 1. Server-side order filtering

Added `src/lib/orders/query.ts` as a pure query module. It converts role scope, deleted-record mode, date windows, courier ownership, status/payment/method/calorie/order-type/quantity/prepaid filters into a Prisma `OrderWhereInput`. The order GET route now executes these constraints in the database and preserves the existing response shape.

This removes the previous pattern of retrieving a broad order set and filtering dates and dashboard filters in JavaScript. It should reduce response payload, server memory pressure, and CPU work as order history grows. The module has three focused unit tests.

### 2. Database indexes

Added indexes for the access patterns now used by order and scope queries:

- `Admin(createdBy, role)` for hierarchy membership lookup.
- `Customer(createdBy, deletedAt)` for scoped active/bin client queries.
- `Order(adminId, deletedAt, createdAt)` for admin order lists.
- `Order(courierId, deliveryDate, deletedAt)` for courier daily lists.
- `Order(orderStatus, deliveryDate)` for status/date filtering.

These schema changes require the repository's explicit DB deployment step. They are not applied by a normal build.

### 3. Dashboard refresh reliability

`useDashboardData` now uses an abort-aware timeout helper, prevents an old aborted refresh from clearing the loading state of a newer refresh, and loads the two bin datasets in parallel. This keeps the existing API contracts and UI state surface while reducing avoidable refresh latency and race conditions.

### 4. Safer production build behavior

`vercel-db-push.mjs` no longer performs schema mutation automatically in production builds. `PRISMA_DB_PUSH_ON_BUILD=true` remains an explicit legacy escape hatch, but the recommended path is a migration/deploy step. This reduces the chance that a failed or concurrent build changes production schema unexpectedly.

### 5. UI recovery and readiness visibility

Added a route-level accessible Next.js error boundary with a retry action and `/api/health/ready`, which performs a DB readiness probe and reports latency without exposing internal error details. The existing `/api/health` liveness endpoint remains unchanged.

### 6. Production-graph typecheck and test seam

Excluded the separate legacy Vite/demo surface from the Next.js production `tsconfig` graph without deleting it. Added `test:unit` for the pure order-query module. This makes the main typecheck represent the application actually built by Next.js while leaving the legacy files available for a deliberate future migration or removal decision.

## Open high-priority risks

The first pass intentionally did not change authentication semantics, finance transaction boundaries, order-number allocation, or the giant admin components. These need a second, separately tested pass:

1. Revalidate JWT-backed users against the current `Admin` row, `isActive`, and role changes; consolidate middleware/auth-config policy.
2. Replace `findFirst(orderBy orderNumber desc) + 1` with a database-backed sequence/counter or a transaction-safe allocation strategy.
3. Make order creation, audit event creation, and payment ledger updates transactionally consistent with an idempotency key.
4. Add pagination or cursor-based loading to order/client/admin lists; server-side filtering alone does not solve unbounded result size.
5. Add Playwright role-matrix and WCAG checks for customer, courier, low-admin, middle-admin, and super-admin critical flows.
6. Instrument request/Prisma/external-provider timings with OpenTelemetry-compatible context and define SLOs before optimizing memory or vendor calls.
7. Split `AdminDashboardPage`, `SetsTab`, `WarehouseTab`, and dispatch components by deep modules, starting with query/mutation adapters rather than visual rewrites.
8. Investigate the Edge Runtime `bcryptjs` warning and make the intended runtime boundary explicit.

## Verification commands

```bash
corepack yarn test:unit
corepack yarn tsc -p tsconfig.json --noEmit
DATABASE_URL='postgresql://user:pass@localhost:5432/db?schema=public' corepack yarn prisma validate
DATABASE_URL='postgresql://user:pass@localhost:5432/db?schema=public' AUTH_SECRET=test-auth-secret NEXTAUTH_SECRET=test-nextauth-secret JWT_SECRET=test-jwt-secret corepack yarn build
```

The repository should apply schema indexes through an explicit deployment/migration action after reviewing the target database. No connected production database was modified during this audit.

## Second professional iteration

The follow-up pass closes the most important consistency gaps identified in the first report. `getAuthUser` now reloads the current admin record and fails closed when the account is missing or inactive, so a stale NextAuth/JWT role cannot continue authorizing protected API work after deactivation or role changes.

The canonical per-order mutation route now executes order update, customer assigned-set update, payment ledger changes, customer balance changes, company balance changes, and order audit events inside one Prisma transaction. It uses an optimistic status precondition so concurrent requests cannot both complete the same order and charge the same financial effects. Settlement arithmetic is extracted into `src/lib/orders/settlement.ts` and covered by unit tests.

The legacy courier completion endpoint now applies the same essential invariants: courier ownership, delivered-state conflict handling, status timestamps, meal deduction ledger entry, customer balance update, and audit event in a transaction. The finance transaction endpoint now writes its action log inside its balance/ledger transaction rather than silently ignoring audit failures.

This iteration adds five passing pure tests in total: three for scoped order query construction and two for settlement/payment arithmetic. A database-backed integration test remains a next step because no connected production database should be used during this audit.

The auth principal now carries the current admin display name from the revalidated DB row, allowing audit records to use a typed actor identity instead of repeated unsafe casts. The second-pass production build compiled successfully and generated all 97 static pages; the existing `bcryptjs` Edge Runtime warning remains an explicit follow-up item because it requires deciding the intended middleware/runtime boundary.

A focused authorization review found that the per-order GET/PATCH handlers previously had no explicit allow-list after authentication; an authenticated `WORKER` principal could fall through the role branches. Both handlers now explicitly allow only `LOW_ADMIN`, `MIDDLE_ADMIN`, `SUPER_ADMIN`, and `COURIER`, matching the order-list policy. This is a security correction, not a UI behavior change.

## Measurable architecture signals

The expanded quality report now records API route count, auth lookup coverage, explicit role-guard coverage, explicit `any` usage, and console statement count. The current snapshot contains 100 API routes, 81 with auth lookup, 61 with explicit role guards, 350 explicit `any` casts/annotations, and 239 console statements. The unauthenticated route list is preserved in the JSON report so public customer-site/auth/cron/health paths can be reviewed separately from protected admin paths. These numbers are tracking signals, not quality scores; the goal is to reduce the risky subset over time without hiding intentional boundaries.

The architecture pass also hardened two adjacent mutation boundaries. Chat message creation now updates `Conversation.lastMessage` and `lastMessageAt` in the same transaction as `Message.create`, and trial expiration now performs admin deactivation and its action logs in one transaction. The quality-report script now emits API/auth coverage and code-signal metrics, making the roadmap measurable in CI/nightly artifacts.

The CI pipeline now starts PostgreSQL 16, applies the Prisma schema, seeds a deterministic `test-admin` fixture, and runs the five pure unit tests before Playwright smoke tests. This is necessary because production-grade auth revalidation must verify claims against an actual current admin row rather than accepting synthetic JWT claims without database state.

Manual order creation has now been moved behind a single transaction boundary for the order row, initial payment ledger, customer/company balances, creation audit, and courier assignment audit. The existing bounded retry for the unique order number remains intact. This removes the prior state where an order could be visible without its audit or its initial payment effects.

## UI vertical slice

The first UI architecture slice extracts the navigation/theme/profile header into `AdminDashboardHeader.tsx`, a typed presentational module with explicit copy, theme and action props. `AdminDashboardPage.tsx` is reduced from 4,156 to 4,050 lines, while the new 120-line module has zero targeted lint warnings. The page still has 67 legacy warnings, which are intentionally tracked for later vertical slices rather than hidden in this change.

## Current post-UI benchmark

At the current PR head, five unit tests pass, production typecheck passes, Prisma schema validation passes, and `git diff origin/main...HEAD --check` is clean. The quality snapshot now reports 100 API routes, 81 with auth lookup, 61 with explicit role guards, 348 explicit `any` casts/annotations, 238 console statements, and a 4,051-line AdminDashboardPage. The UI header extraction reduced the page from 4,156 to 4,051 lines and introduced no targeted lint warnings in the new module.

The orders collection endpoint now supports opt-in bounded pagination (`limit`/`offset`, max page size 500) while preserving the existing JSON array response when callers omit pagination. Paginated responses expose `X-Orders-Total`, `X-Orders-Offset`, `X-Orders-Limit`, and `X-Orders-Has-More` headers for incremental UI adoption. The order test seam now has seven passing tests, including pagination defaults and clamping.

Administrative action-log reads now clamp `limit` to 200 and normalize negative/invalid offsets, preventing unbounded audit-table reads while keeping the existing response contract intact.

The CI quality gate now includes an opt-in database-backed integration test for scoped and paginated order queries. It creates a minimal PostgreSQL fixture using the seeded `test-admin`, verifies the actual Prisma query returns the expected pending order and total, and cleans up its rows. The test safely skips when no `DATABASE_URL`/integration flag is present locally.

## Current-head verification

The current PR head compiles successfully and generates all 97 static pages. The build still reports the pre-existing `bcryptjs` Edge Runtime warning and deterministic-generation fallback when `GEMINI_API_KEY` is absent; neither prevents compilation. The next production decisions are to separate the Node-only auth path from Edge middleware and to make external AI generation configuration explicit in deployment checks.

The Edge Runtime warning is now resolved rather than deferred: `middleware.ts` uses the edge-safe `auth.config` through `NextAuth(authConfig)` instead of importing the Node-only `src/auth.ts` path that includes bcrypt/Prisma. The latest build reports zero `bcryptjs` Edge warning occurrences, compiles successfully, and generates 97/97 pages. Protected API handlers continue using the full Node auth path with DB revalidation.

The targeted security scan found no new hardcoded credentials or raw SQL in the changed business routes. It did identify that chat payload validation relied on `trim()` and could turn malformed JSON types into a 500 response; the endpoint now uses a Zod schema and returns 400 for invalid conversation/message payloads before any database work. Conversation participant authorization remains enforced separately.

Final-head production verification after the chat validation change completed successfully: Next.js compiled, 97/97 static pages were generated, and the build emitted zero `bcryptjs` Edge warnings. The build used non-production placeholder secrets and a non-routable local PostgreSQL URL; no production database mutation was performed.

## Transaction-safe order-number allocation

The remaining application-managed order writers no longer derive `orderNumber` with an unlocked `findFirst(orderBy: desc) + 1`. `src/lib/orders/number.ts` now provides a small allocator interface that acquires a PostgreSQL transaction advisory lock, reads the current maximum inside the same transaction, and returns the next number. Manual orders, all auto-order variants, admin scheduling, cron scheduling, and system scheduling allocate and insert through that same transaction-scoped seam. The lock is released automatically on commit or rollback, so concurrent writers cannot select the same number.

A PostgreSQL integration test exercises six concurrent transactions and asserts uniqueness plus consecutive allocation. The test is included in the existing CI integration command and safely skips when no integration database is configured. Generic database import endpoints intentionally remain explicit-data import tools: they accept caller-supplied order numbers rather than minting application-managed numbers and are tracked separately for future validation hardening.

The order-reordering mutation also acquires the same advisory lock and performs its maximum-number lookup inside the transaction. This closes the remaining application-managed race between renumbering and new-order allocation. XLSX/database-row import handlers are intentionally not converted: they are explicit-data import tools that accept supplied order numbers and require a separate validation/import policy review.

The allocator commit also passed a production Next.js build: compilation succeeded, all 97/97 static pages were generated, and the build reported zero `bcryptjs` Edge Runtime warnings. The build used placeholder secrets and a non-routable local PostgreSQL URL; it did not mutate a production database.

## Bounded admin client collection reads

The admin clients GET route now uses the shared `src/lib/pagination.ts` seam. When `limit` or `offset` is omitted, it preserves the existing complete JSON array response and performs no count query. When pagination is explicitly requested, the database applies `take`/`skip`, the route performs a scoped count, and exposes `X-Clients-Total`, `X-Clients-Offset`, `X-Clients-Limit`, and `X-Clients-Has-More` headers. The existing order-specific pagination exports remain as a compatibility adapter over the shared parser, and the dashboard caller is intentionally unchanged for incremental adoption.

The client-pagination head passed the production Next.js build with exit code 0: compilation succeeded, 97/97 static pages were generated, and zero `bcryptjs` Edge Runtime warnings were emitted. The build used placeholder secrets and a non-routable local PostgreSQL URL and did not mutate production data.

## Admin signup rate limiting

The admin signup endpoint now applies the existing rate-limit adapter before database lookup and password hashing, keyed by client IP and normalized email. It allows five attempts per hour and returns `429` with `retryAfterSec` after the threshold; successful signup and all existing validation response shapes remain unchanged. The rate-limit contract now has dedicated unit coverage and is included in the CI unit script. This remains best-effort per process because the existing limiter is in-memory; a distributed adapter is still required for strict multi-instance enforcement.

The signup-rate-limit head passed the production Next.js build: compilation succeeded, 97/97 static pages were generated, and zero `bcryptjs` Edge Runtime warnings were emitted. The build used placeholder secrets and a non-routable local PostgreSQL URL and did not mutate production data.

## Security headers and CSP rollout

The existing middleware header wrapper is now backed by `src/lib/security-headers.ts`, a pure policy module with unit coverage. Baseline headers remain active in every middleware response. In production, HSTS is applied and a conservative `Content-Security-Policy-Report-Only` policy is emitted, optionally including `CSP_REPORT_URI`; enforcement is intentionally staged because the repository currently uses external map tiles, images, frames, inline styles, and provider integrations that require an evidence-based allowlist. The policy denies plugins, restricts framing and form actions, and reports violations without breaking existing customer/admin flows. The unit suite now contains 12 passing tests.

The security-headers head passed the production Next.js build with exit code 0: compilation succeeded, 97/97 static pages were generated, and the middleware bundle remained Edge-safe with zero `bcryptjs` warnings. The build used placeholder secrets and a non-routable local PostgreSQL URL and did not mutate production data.

## Explicit Gemini configuration

The website content generator now reads Gemini configuration through `src/lib/ai/config.ts`, which exposes an explicit `gemini` versus `deterministic-fallback` mode. It no longer instantiates `GoogleGenerativeAI` with an empty key or emits an import-time warning during every build. Existing callers still receive deterministic generated content when `GEMINI_API_KEY` is absent and AI-generated content when a non-empty key is configured. The configuration contract has two unit tests and is included in the CI unit script; the separate AI chat/orchestrator clients remain future work because they require an explicit unavailable-provider response policy.

The explicit-Gemini head passed the production Next.js build: compilation succeeded, 97/97 static pages were generated, zero `bcryptjs` Edge Runtime warnings were emitted, and the previous `GEMINI_API_KEY is not defined` import-time warning count was zero. Deterministic fallback generation remained available without a provider key.

## Bounded courier collection reads

The admin couriers GET route now uses the shared bounded pagination parser. Existing callers that omit pagination continue receiving the complete transformed courier array. Opt-in callers receive database-level `take`/`skip` behavior plus `X-Couriers-Total`, `X-Couriers-Offset`, `X-Couriers-Limit`, and `X-Couriers-Has-More` metadata headers while preserving role-scoped filtering.

The courier-pagination head passed the production Next.js build: compilation succeeded, 97/97 static pages were generated, and both `bcryptjs` Edge warnings and the old Gemini fallback warning count were zero. The build used placeholder secrets and a non-routable local PostgreSQL URL and did not mutate production data.
