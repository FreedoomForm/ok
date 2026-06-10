# ADR-004: View API / BFF Aggregation for Dashboard

**Date:** June 2026  
**Status:** Accepted  
**Decision makers:** Architecture team

## Context

The admin dashboard (`AdminDashboardPage.tsx`) initially made 5-8 separate API calls on page load:

1. `GET /api/admin/me` — Current user info
2. `GET /api/admin/statistics` — Order statistics
3. `GET /api/admin/clients` — Customer list
4. `GET /api/admin/couriers` — Courier list
5. `GET /api/admin/sets` — Menu sets
6. `GET /api/admin/low-admins` — Low admin list
7. `GET /api/admin/orders?deleted=true` — Bin orders
8. `GET /api/admin/clients/bin` — Bin clients

Problems with this approach:
1. **Waterfall latency** — 5-8 round-trips, each with TCP handshake + TLS + server processing
2. **Over-fetching** — Each endpoint returns full data even if the dashboard only needs a subset
3. **Race conditions** — State updates from multiple concurrent responses can conflict
4. **Error handling** — 8 potential failure points, each handled differently
5. **Loading states** — 8 separate loading indicators or complex combined loading state

Options considered:
1. **Keep individual calls** — Status quo, but optimize each endpoint
2. **GraphQL** — Single endpoint, client-specified query shape
3. **BFF View API** — Server-side aggregation endpoint that combines data from multiple modules
4. **Server Components** — Use Next.js RSC to fetch data on the server

## Decision

We chose **BFF View API** — a server-side aggregation endpoint that combines data from multiple modules into a single response.

```
GET /api/admin/views/dashboard?sections=overview,stats,orders,clients,couriers,sets
```

### How it works

```ts
// src/views/dashboard.view.ts
export async function getDashboardView(input: DashboardViewInput): Promise<DashboardViewData> {
  const sections = parseSections(input.sections)

  // Load each section in parallel, with graceful partial failure
  const [overview, stats, orders, clients, couriers, sets] = await Promise.all([
    safeLoad('overview',  () => loadOverview(input)),
    safeLoad('stats',     () => executeGetOrderStats({ user: input.user })),
    safeLoad('orders',    () => executeListOrders({ user: input.user, ... })),
    safeLoad('clients',   () => executeListCustomers({ user: input.user, ... })),
    safeLoad('couriers',  () => loadCouriers(input)),
    safeLoad('sets',      () => loadSets(input)),
  ])

  return { overview, stats, orders, clients, couriers, sets }
}
```

Key design decisions:
1. **Parallel section loading** — `Promise.all` for all sections simultaneously
2. **Graceful partial failure** — `safeLoad()` wraps each section; if one fails, others still return
3. **Section selection** — Client specifies which sections via `?sections=` query param
4. **Reuses existing modules** — Calls `executeListOrders`, `executeGetOrderStats`, etc. from application layer

## Rationale

### Why NOT keep individual calls?

- **5-8 round-trips on every page load** — Even with HTTP/2 multiplexing, each request adds latency
- **Mobile/slow networks** — Multiple round-trips are especially painful on 3G/4G
- **State management complexity** — 8 separate loading/error states in the frontend hook

### Why NOT GraphQL?

- **Infrastructure overhead** — Would need Apollo Server or similar, schema stitching, resolvers
- **Team familiarity** — Team knows REST, not GraphQL
- **Next.js integration** — App Router has excellent REST support; GraphQL adds a layer
- **Overkill for one page** — The dashboard is the only page that needs aggregation

### Why NOT Server Components?

- **Client-side state** — The dashboard has complex client-side state (filters, modals, real-time updates). RSC doesn't replace `useDashboardData` hook.
- **Hybrid rendering** — Dashboard is already client-rendered (interactive tabs, forms). Moving to RSC would require restructuring the entire page.
- **Future option** — RSC can be adopted later for the initial data load, while keeping the View API for client-side refreshes.

### Why BFF View API?

1. **Single round-trip** — 5-8 calls → 1 call. Latency reduced from ~800ms to ~200ms.
2. **Server-side parallelism** — Sections load in parallel on the server (function calls, no HTTP overhead).
3. **Graceful degradation** — If one section fails, others still return. Frontend can show partial data.
4. **Reuses module application layer** — No duplicated business logic. View API calls the same `execute*` functions.
5. **Backward compatible** — Frontend tries View API first, falls back to individual calls if unavailable.
6. **Selective loading** — `?sections=stats,orders` loads only needed sections.
7. **No new infrastructure** — Standard `createApiRoute` endpoint. No GraphQL server needed.

### Frontend integration

```ts
// useDashboardData.ts
async function loadDashboardView() {
  try {
    const res = await fetch('/api/admin/views/dashboard?sections=overview,stats,orders,clients,couriers,sets')
    if (res.ok) {
      const json = await res.json()
      return json.data // Single response with all sections
    }
  } catch {
    // Fall back to individual API calls
  }
  return loadIndividualCalls() // Legacy fallback
}
```

## Consequences

### Positive
- Dashboard loads with 1 API call instead of 5-8
- Graceful partial failure — failed sections don't break the entire dashboard
- Server-side parallelism is faster than client-side parallelism (no HTTP overhead)
- Reuses existing application layer (no duplicated logic)
- Backward compatible — legacy fallback if View API fails
- Selective section loading reduces over-fetching

### Negative
- View API is a "god endpoint" that depends on multiple modules
- View API response shape is harder to cache (multiple data types in one response)
- Changes to any module's DTO might affect the View API response
- `safeLoad` catches errors silently — failed sections are `SectionError` objects that the frontend must handle

### Mitigations
- **God endpoint** — View API is intentionally a BFF (Backend for Frontend). It's coupled to the dashboard UI, not to other modules. It calls module public APIs, not internals.
- **Caching** — View API doesn't cache (dashboard data changes frequently). Individual module queries can be cached independently.
- **DTO changes** — View API returns the same DTOs as individual endpoints. If a DTO changes, both the View API and individual endpoints change consistently.
- **SectionError handling** — Frontend checks `isSectionError(result.section)` and shows appropriate UI (skeleton or error message) for failed sections.
