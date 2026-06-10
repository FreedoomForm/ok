# Audit follow-up — response to the 5 review points

Each point was verified against the actual repository before acting. Summary of
what was applied, corrected, or found to be a non-issue.

## 1.1 — `tokens.css` import path → **N/A (would break the build)**

There is **no `src/styles/` directory and no `tokens.css`** anywhere in the repo.
Design tokens are defined **inline** in `src/app/globals.css` using Tailwind v4
`@theme inline { ... }` (this project is Tailwind v4, no `tailwind.config` token
layer). Adding `@import "../styles/tokens.css"` would import a nonexistent file
and fail the build. **No change made** — the token system is already correct.

## 1.2 — DB audit blind to Prisma camelCase → **valid principle, audit created**

No DB-audit script existed in the repo. The underlying concern is real and
sharper than stated: **columns ARE camelCase** (`createdAt`, `deletedAt`,
`eventType`, …) because `@@map` is applied to tables but not columns. Added a
read-only audit that checks **both** snake_case and camelCase:

- `scripts/db-audit.sql`, `scripts/db-audit.mjs`, `npm run db:audit`.

Also corrected the misleading schema header that claimed columns were snake_case.

## 1.3 — Don't apply raw `outbox_events` SQL blindly → **already safe**

`OutboxEvent`, `OrderAuditEvent`, `ActionLog` exist as **Prisma models**. The
baseline migration was **generated from the schema** (`prisma migrate diff`), not
hand-written, so its table names match Prisma's `@@map` (`outbox_events`,
`order_audit_events`, `action_logs`) — **no `OutboxEvent` vs `outbox_events`
duplication is possible**. No raw operational migration was ever applied.

## 1.4 — Neon needs `DIRECT_URL` → **applied (with a footgun fixed)**

Added `directUrl = env("DIRECT_URL")` to `schema.prisma` and documented pooled vs
direct URLs in `.env.example` + `docs/db/MIGRATIONS.md`.

Important correction to the suggestion: Prisma does **not** silently fall back to
`DATABASE_URL` when `DIRECT_URL` is missing — the schema fails to parse. That
would have broken every CI job that runs `prisma generate`/`validate`. Fixes:

- `scripts/prisma-generate.mjs` defaults `DIRECT_URL` to `DATABASE_URL`.
- `DIRECT_URL` added to the `build` and `db-migration-check` jobs in `ci.yml`,
  and to `deploy.yml` / `nightly-quality.yml` build steps.

Verified: `check-migration.sh`, `typecheck`, `build`, `test`, `lint` all pass.

## 1.5 — "modules not implemented" → **corrected with hard numbers**

Measured per-module file counts (non-test):

| module | domain | application | infra | tests |
|--------|-------:|------------:|------:|------:|
| admins | 5 | 17 | 2 | 2 |
| chat | 5 | 9 | 2 | 1 |
| courier | 5 | 16 | 2 | 2 |
| customers | 5 | 11 | 2 | 5 |
| finance | 5 | 10 | 2 | 3 |
| orders | 5 | 12 | 4 | 6 |
| sites | 5 | 13 | 8 | 0 |
| warehouse | 5 | 12 | 3 | 2 |

All 8 modules are **substantively implemented** (Clean Architecture), not stubs.
The real gap is **HTTP wiring**: of **214** route handlers, only ~11 call the
module application layer while ~25 still import the DB directly (rest are legacy
`/api/admin/*`). Honest statement:

> Контракты, модульность и DTO реализованы по всем 8 модулям (domain/application/
> infrastructure/contracts + тесты). Незавершено — миграция HTTP-слоя: большинство
> из 214 route handlers пока не подключены к application-слою (часть всё ещё ходит
> в Prisma напрямую). Это и есть основная работа следующих PR.

## PR — customer-facing routes moved onto the module layer

Most of the original roadmap (extract AdminDashboard, orders reference module,
dashboard View API) was found **already done** when measured against the code:

- `AdminDashboardPage.tsx` is **242 lines**, fully decomposed into
  `src/features/admin-dashboard/` (model/shell/tabs/hooks/modals).
- `/api/orders/*` handlers are already thin and call the orders module.
- `/api/admin/views/dashboard` (BFF View API) already exists.

The real remaining gap was **route → module wiring** (24 handlers still hit
Prisma directly). This PR closes two of the highest-value ones and fixes a real
correctness/security bug found along the way:

### Bug fixed: `GET /api/customers` was unbounded **and** cross-tenant
It did `db.customer.findMany({ where: { isActive: true } })` — no pagination and
**no role scoping**, so any LOW/MIDDLE admin received every customer across all
groups (violates DB DS §21 multi-tenant rule + the "lists must be bounded" rule).
Rewired to `executeListCustomers({ user, cursor, limit })` (role-scoped + cursor
pagination). Response shape now matches the sibling `/api/admin/clients`:
`{ data, meta: { nextCursor, hasMore } }`.

### `GET /api/customers/orders/[id]` moved off direct Prisma
Added a proper customer-facing slice to the **orders module**:
- `CustomerOrderTracking` DTO (minimal: status + ETA + live courier coords; no
  admin/audit fields),
- `getCustomerOrderTracking()` repo fn — ownership enforced **in the query**
  (`customerId` filter + `deletedAt: null`); foreign/missing → 404 (no existence
  leak),
- `executeGetCustomerOrderTracking()` application query,
- 5 unit tests for the pure transformer (`customer-order-tracking.test.ts`).

Direct-Prisma route handlers: **24 → 22**. Tests: **315 → 320** pass.

## §5 — "add quality.yml" → **redundant**

A comprehensive `ci.yml` already exists: install + typecheck + lint + unit tests +
build (with 500KB bundle budget) + `db-migration-check` + Gitleaks + npm audit,
all via Corepack **Yarn 4** and the project's real `typecheck`/`lint` scripts.
Adding a separate `quality.yml` (plain `tsc`/`eslint .`, `yarn install` without
`--immutable`) would duplicate and conflict. **No new workflow added**; instead
the existing CI was hardened for `DIRECT_URL`.
