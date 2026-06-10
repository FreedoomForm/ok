# ADR-001: Modular Monolith over Microservices

**Date:** June 2026  
**Status:** Accepted  
**Decision makers:** Architecture team

## Context

The AutoFood delivery platform started as a single Next.js application with ~90 inline API routes, a 4100-line monolith component (`AdminDashboardPage.tsx`), and all business logic in `lib/` utilities and route handlers. We needed to decide on an architectural approach for restructuring.

Options considered:
1. **Microservices** — Split into separate services (orders-service, finance-service, etc.)
2. **Modular monolith** — Keep single deployment unit, but organize code into isolated modules with clear boundaries
3. **Big ball of mud** — Continue current approach (rejected)

## Decision

We chose **modular monolith** — a single Next.js application with business logic organized into isolated modules under `src/modules/`, each following Clean Architecture (contracts → infrastructure → application).

## Rationale

### Why NOT microservices?

1. **Team size** — AutoFood has a small team (2-3 developers). Microservices introduce operational overhead (service discovery, inter-service communication, distributed transactions) that doesn't justify the cost at this scale.

2. **Data consistency** — Orders, customers, finance, and warehouse are tightly coupled. A single order creation touches customers (balance), warehouse (inventory), and finance (transaction). In microservices, this would require sagas or distributed transactions, adding enormous complexity.

3. **Deployment simplicity** — Single Next.js deployment to Vercel is trivial. Multiple services would require container orchestration, API gateways, and separate CI/CD pipelines.

4. **Shared database** — All modules share the same PostgreSQL database. Extracting separate databases per service would be a massive migration with little benefit.

5. **Latency** — Inter-module calls are function calls (nanoseconds), not HTTP/gRPC (milliseconds). For a food delivery platform, every millisecond counts for dispatch and route optimization.

### Why modular monolith?

1. **Clear boundaries** — Each module (`orders`, `customers`, `finance`, etc.) has its own `contracts/`, `infrastructure/`, and `application/` layers. Cross-module access goes through public API (exported functions), not internal implementation.

2. **Future optionality** — If the team grows or a module needs independent scaling, the module can be extracted to a microservice with minimal changes (only the transport layer changes; contracts and application layer stay the same).

3. **Strangler Fig compatible** — Modules can be migrated one at a time from legacy code. No big-bang rewrite required. This is exactly what the 20-step roadmap does.

4. **Single deployment** — One `next build`, one Vercel deployment, one set of environment variables. DevOps overhead stays constant.

5. **Type safety** — TypeScript across the entire application. Cross-module contracts are compile-time checked. In microservices, contracts would need code generation or runtime validation.

## Consequences

### Positive
- Single deployment unit (Vercel)
- Compile-time type safety across all modules
- Zero-latency inter-module communication
- Gradual migration via Strangler Fig pattern
- Easy to test (module isolation with dependency injection)

### Negative
- Modules share the same database (no schema isolation)
- No independent scaling of individual modules
- Risk of module coupling if boundaries are not enforced
- All modules share the same deployment cycle

### Mitigations
- **Schema isolation** — Each module's repository uses Prisma select presets, preventing direct table access from other modules. Future: consider schema-per-module with Prisma multi-schema.
- **Boundary enforcement** — ESLint rule (future) to prevent direct imports from another module's `infrastructure/` or `application/` layers. Only `contracts/` and `index.ts` are public API.
- **Independent scaling** — If a specific module (e.g., courier location updates) needs higher throughput, it can be extracted to a separate service using the same contracts.
