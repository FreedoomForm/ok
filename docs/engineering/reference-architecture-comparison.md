# AutoFood reference-driven architecture baseline

**Дата:** 2026-08-21  
**Проект:** AutoFood (`ozodbekasilbekov2-gif/ok`)  
**Рабочая ветка:** `manus/next-professional-improvements`

## Purpose

This document restores the reference architecture that must guide the next improvement cycles. AutoFood will **not copy another project's stack**. It will preserve its current Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, NextAuth, and Vercel-compatible deployment path while adopting the strongest transferable ideas from mature open-source restaurant, delivery, and commerce platforms: explicit domain surfaces, deep modules, replaceable adapters, durable auditability, measured database access, and feature-level regression verification.

> **Compatibility rule:** Every refactor must preserve current successful response envelopes and existing user-visible capabilities unless a deliberate compatibility adapter and migration test are added first.

## Verified reference repositories

| Reference | Verified first-party source | What it is useful for | What AutoFood must not copy |
|---|---|---|---|
| **Enatega Multi Vendor Delivery** | [official repository][1] | Closest product/domain reference: separate customer, rider/driver, vendor/store, ordering website, admin dashboard, API, analytics, error monitoring, multiple vendors/regions, and multiple delivery verticals. | Its README states that frontend applications are open source while the backend/API are proprietary or licensed. It is not a complete backend implementation to transplant, and its React Native/GraphQL/Mongo-oriented stack is not AutoFood's stack. |
| **Medusa** | [official repository][2] | Strongest architecture reference for modular commerce primitives, package-level ownership, integration tests, changesets, migrations/backfills, index changes, runtime/build checks, and replaceable module implementations. | Do not turn AutoFood into Medusa or adopt its package graph wholesale. Transfer the modularity and testing discipline only where it gives locality and leverage. |
| **TastyIgniter** | [official repository][3] | Strong restaurant-management reference: explicit separation of application, database, routes, resources, themes, extensions, storage, tests, and security/deployment concerns. | Its Laravel/PHP/Nginx/PHP-FPM deployment model is not compatible with the current Vercel/Next.js runtime and must not be copied. |

These references are **architecture and product-surface comparators**, not claims that AutoFood should become a clone. Their public repository structure and recent engineering history show mature practices around separation of concerns, testing, migrations, security, and deployability; individual contributor seniority is not inferred from repository visibility alone.

## AutoFood baseline

AutoFood already contains a broad domain surface: role-driven administration, customers and customer sites, orders, courier dispatch, warehouse ingredients and dishes, cooking plans, menus and sets, finance and salary payments, chat, website editing, AI, PWA behavior, and audit/action logs. The Prisma schema currently contains 17 principal models, including `Admin`, `Customer`, `Order`, `OrderAuditEvent`, `ActionLog`, `Website`, warehouse/menu models, `Transaction`, and messaging models. The application currently exposes 100 API route files.

| Signal | Current baseline | Professional implication |
|---|---:|---|
| API route files | 100 | Route count is not itself a problem; policy and domain behavior need stronger shared seams. |
| Routes with auth lookup | 81 | The remaining public/cron/health/customer-site paths require explicit classification and regression coverage, not blanket authentication. |
| Routes with explicit role guards | 74 | Role matrix coverage should be browser-tested, especially for low, middle, super-admin, courier, and customer-site roles. |
| Largest UI module | `AdminDashboardPage.tsx`, 208,587 bytes / about 4,051 lines | The next refactor should deepen the data/mutation interface and extract vertical slices, not perform a risky visual rewrite. |
| Other large UI modules | `SetsTab.tsx`, `WarehouseTab.tsx`, database page, courier page, dispatch map | These are candidates for domain-specific seams with browser tests at the same interface callers use. |
| Explicit `any` signals | 318 in the latest quality snapshot | Reduce high-risk `any` at persistence, authorization, and mutation seams first; do not mass-rewrite harmless legacy rendering code. |
| Console statements | 237 in the latest quality snapshot | Replace critical route/security/finance logs with structured, redacted telemetry before chasing low-risk UI logs. |
| Unit tests | 66 passing | Keep pure validation/policy tests, then add route-interface and browser regression tests for each vertical slice. |
| PostgreSQL integration tests | 2 passing | Expand only around concurrency, scopes, indexes, and transaction invariants; never use production data. |
| Production build | 97/97 pages in the latest verified build | Preserve Vercel-compatible build behavior and keep schema mutation out of ordinary build execution. |

## Domain model comparison

### 1. Delivery operations

Enatega's product surface separates customer, rider, vendor/store, ordering website, and admin concerns. AutoFood already has customer-site, courier, admin, and warehouse/finance concerns, but much of the middle/low-admin behavior is composed inside `AdminDashboardPage.tsx` and raw fetch/mutation handlers. The transferable improvement is an **Operations workspace module** with a small interface for loading role-scoped data and executing order/customer/dispatch commands, while the existing routes and response envelopes remain adapters behind it.

The target seam is not a generic `ApiService`. It is the domain concept that AutoFood callers already understand: **a role-scoped delivery workspace**. Its interface should expose typed read models and command results, while authorization, timeout policy, and response normalization remain inside adapters. Browser tests should exercise the workspace through visible role navigation and critical mutations.

### 2. Commerce and finance primitives

Medusa's repository demonstrates a package-oriented approach in which domain modules, integration tests, changesets, migrations, and runtime checks evolve together. AutoFood should deepen its **Order lifecycle module**, **Inventory module**, and **Ledger module** behind narrow interfaces. The existing recent improvements already provide strong seams for order-number allocation, settlement arithmetic, finance validation, salary atomicity, and ingredient-purchase conditional debits. The next step is to make transaction/audit invariants explicit in module interfaces and integration tests rather than leaving them implicit in large route handlers.

A database change is professional only when the corresponding interface, migration/index reasoning, integration test, and rollback/compatibility story are present. New indexes must be justified by measured query patterns and checked against PostgreSQL plans; no destructive reset or production mutation is acceptable.

### 3. Restaurant operations and customer-facing surfaces

TastyIgniter's repository separates restaurant application code, database, routes, themes, extensions, storage, and tests. AutoFood has analogous capabilities, but customer subdomain websites, AI website editing, PWA assets, admin UI, and data access are not yet expressed as equally explicit modules. The non-breaking target is to create explicit **Customer Site**, **Theme/Website**, **Warehouse**, and **Finance** seams around current behavior, then migrate callers incrementally through adapters.

Theme and customer-site changes must be browser-verified at the public/customer interface. Admin-only tests cannot establish that a customer can still authenticate, view a menu, read a plan, see balance/history, or remain isolated from another customer's records.

## Reference-driven architecture candidates

| Candidate module | Current friction | Deepening direction | First test surface |
|---|---|---|---|
| **Role-scoped Operations Workspace** | `useDashboardData` and `AdminDashboardPage` combine auth revalidation, multiple fetches, timeout policy, mutable state, and UI orchestration. | Introduce a typed read-model/command interface with query-specific adapters; keep route contracts unchanged. | Browser role login, dashboard hydration, tab visibility, order/customer refresh, unauthorized redirect. |
| **Order Lifecycle** | Order status, payment, customer balance, audit, courier assignment, and dispatch behavior span many route handlers. | Centralize lifecycle invariants and idempotency at an internal module seam; keep legacy route handlers as compatibility adapters. | PostgreSQL transaction/integration tests plus browser status update and timeline checks. |
| **Ledger and Finance** | Finance mutations have different balance policies and historical response shapes. | Define typed ledger commands with conditional debits, audit durability, scope policy, and stable result envelopes. | Concurrent integration tests, role matrix, finance UI mutation and error-state browser checks. |
| **Customer Site and Theme** | Subdomain/customer pages, website editing, translations, PWA, and shared data are spread across routes/components. | Separate customer-site read models from admin editing commands and theme/runtime assets. | Browser customer login, menu/plan/balance/history, cross-customer isolation, responsive/accessibility checks. |
| **Warehouse and Menu** | Ingredients, dishes, sets, cooking plans, and purchases are split across large UI and route files. | Create typed warehouse commands/read models and keep unit conversion/index/stock invariants local. | Browser create/update/filter flow plus PostgreSQL inventory consistency tests. |

## Non-breaking migration rules

1. **Preserve response envelopes.** New modules may normalize internally, but existing route response shapes remain adapters until all callers migrate and compatibility tests pass.
2. **Preserve URL and role semantics.** Existing role homes, API paths, customer subdomains, and Vercel environment conventions remain stable.
3. **Prefer additive database evolution.** Add nullable columns/indexes/constraints only after query and migration review; backfill separately; never reset or drop production data during this work.
4. **Keep Vercel compatibility.** Do not introduce a persistent local-only process, filesystem state, unsupported native runtime, or non-Node worker into request paths. Use PostgreSQL and external storage abstractions already compatible with deployment.
5. **One vertical slice at a time.** Each slice includes code, database reasoning if relevant, focused unit/integration tests, browser regression coverage, TypeScript/lint/build checks, a runtime note, and a separate commit.
6. **Browser is the feature contract.** A feature is not considered verified because a schema test passes. The relevant role must navigate to it, see loading/empty/error states, perform the mutation, and observe the expected durable result.
7. **Measure before restructuring.** Record route timing, browser navigation timing, query counts, bundle/First Load JS, and repeated dashboard refresh behavior before claiming performance improvement.

## Immediate priority order

The first implementation target is the **Role-scoped Operations Workspace** because it is the highest-leverage seam: it sits at the center of the largest UI module, affects every admin role, and provides a natural place to add browser-first verification without changing route contracts. The next targets are customer-site browser coverage, order lifecycle/idempotency, finance role-matrix and concurrency checks, warehouse/menu vertical extraction, and finally broad UI accessibility/performance cleanup.

## References

[1]: https://github.com/enatega/food-delivery-multivendor "Enatega official GitHub repository"
[2]: https://github.com/medusajs/medusa "Medusa official GitHub repository"
[3]: https://github.com/tastyigniter/TastyIgniter "TastyIgniter official GitHub repository"
[4]: https://nextjs.org/docs/app/guides/production-checklist "Next.js production checklist"
[5]: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/ "OWASP API1:2023 BOLA"
[6]: https://www.w3.org/TR/WCAG22/ "W3C WCAG 2.2"
