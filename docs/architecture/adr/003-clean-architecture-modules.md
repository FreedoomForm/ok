# ADR-003: Clean Architecture Modules (contracts / infrastructure / application)

**Date:** June 2026  
**Status:** Accepted  
**Decision makers:** Architecture team

## Context

Before the refactor, business logic was scattered across three layers:
1. **API route files** — Inline Prisma queries, auth checks, validation, error handling, all in one function
2. **`lib/` utilities** — Helper functions with mixed concerns (some were pure, some had side effects)
3. **React components** — Data fetching hooks with business logic embedded in UI code

This led to:
- **No separation of concerns** — A route handler did auth + validation + DB query + response formatting
- **Untestable code** — Business logic could only be tested through HTTP integration tests
- **Prisma type leakage** — Raw Prisma entities were returned directly to API consumers, coupling the API contract to the database schema
- **No role-based scoping** — Each route implemented its own access control logic inconsistently
- **N+1 queries** — Customer list loaded defaultCourier and assignedSet one-by-one

Options considered:
1. **MVC (Model-View-Controller)** — Traditional web pattern, but "Model" is ambiguous (is it a Prisma model? a DTO?)
2. **Clean Architecture (contracts / infrastructure / application)** — Strict layering with explicit contracts
3. **Domain-Driven Design (DDD)** — Aggregates, value objects, domain events; heavier than needed
4. **Flat module structure** — Just put files in a module directory without layering

## Decision

We chose **Clean Architecture** with three layers per module:

```
src/modules/<domain>/
├── contracts/          # DTOs and type definitions (no business logic)
│   ├── <domain>.dto.ts
│   └── index.ts
├── infrastructure/    # Data access (Prisma repository with select presets)
│   ├── <domain>.repository.ts
│   └── index.ts
├── application/       # Use-case queries and commands (auth + validation + business logic)
│   ├── queries/
│   │   ├── <query-name>.ts
│   │   └── index.ts
│   ├── commands/
│   │   ├── <command-name>.ts
│   │   └── index.ts
│   └── index.ts
└── index.ts           # Module barrel export (public API)
```

## Rationale

### Why NOT MVC?

- **"Model" is ambiguous** — In our context, "model" could mean Prisma model, DTO, or domain entity. Clean Architecture's naming (`contracts`, `infrastructure`, `application`) is unambiguous.
- **Controllers map 1:1 to routes** — We already have route handlers; adding controllers creates an unnecessary layer.
- **No DTO concept** — MVC doesn't distinguish between database entities and API contracts.

### Why NOT DDD?

- **Team size** — DDD works best with domain experts who speak ubiquitous language. Our team is developer-heavy.
- **Aggregate complexity** — Our domain (food delivery) has straightforward CRUD with some business rules, not complex invariants that need aggregate roots.
- **Event sourcing overhead** — We don't need domain events for current requirements. Audit events (in `action_logs` table) are sufficient.

### Why NOT flat structure?

- **No enforced boundaries** — Flat structure makes it easy for queries to import from commands, DTOs to import Prisma types, etc.
- **Scalability** — As modules grow, flat structure becomes a "mini lib/" with the same problems.

### Why Clean Architecture?

1. **Contracts layer isolates API from database** — DTOs are plain TypeScript interfaces. If the Prisma schema changes, only `infrastructure/` needs updating. The API contract stays stable.

2. **Infrastructure layer centralizes data access** — Prisma select presets prevent `SELECT *` leaks. Repository functions are the only way to access data. Transformers convert Prisma entities to DTOs.

3. **Application layer enforces business rules** — Every query/command receives an `AuthUser` and enforces role-based scoping. No route can bypass access control by calling the repository directly.

4. **Testability** — Application layer functions can be unit-tested with mocked repositories. Contracts can be tested for backward compatibility. Infrastructure can be tested with test databases.

5. **CQRS-lite** — Separating queries from commands makes the codebase easier to navigate. A new developer looking for "how orders are created" knows to look in `application/commands/create-order.ts`.

6. **Strangler Fig compatible** — New modules can be built in Clean Architecture while legacy code continues to work. Migration is gradual.

### Key patterns within each layer

#### Contracts (`contracts/`)
- Pure TypeScript interfaces and type aliases
- Mirror Prisma enums without importing `@prisma/client`
- Convention: `ListItem` (lightweight), `Detail` (full), `CreateData` (input), `UpdateData` (partial input)

#### Infrastructure (`infrastructure/`)
- Prisma select presets as constants (e.g., `ORDER_LIST_SELECT`, `CUSTOMER_DETAIL_SELECT`)
- Transformer functions (e.g., `toListItem(prismaResult): OrderListItem`)
- Repository functions that take typed inputs and return typed DTOs
- No business logic — only data access and transformation

#### Application (`application/`)
- Query functions: `execute<QueryName>(query: <QueryName>Query): Promise<Result>`
- Command functions: `execute<CommandName>(command: <CommandName>Command): Promise<Result>`
- Each function receives auth context (`user: AuthUser`) and enforces scoping
- Uses shared validation (`validate`, `validateBody`)
- Uses shared audit logging (`logAuditEvent`)
- Throws `AppError` subclasses for controlled error responses

## Consequences

### Positive
- Clear separation: DTOs → data access → business logic
- API contract stability — Prisma schema changes don't break frontend
- Role-based scoping enforced at application layer (can't bypass)
- Prisma select presets prevent data leaks
- Testable in isolation (mock repository → test application layer)
- Easy to navigate (convention over configuration)

### Negative
- More files per feature (3 layers × 2+ files = 6+ files vs. 1 inline route)
- Boilerplate for simple CRUD (a "list items" query needs contracts + repository + query + barrel)
- Risk of over-engineering for simple features
- Barrel exports add indirection (need to navigate through `index.ts` files)

### Mitigations
- **Boilerplate** — Use existing modules as templates. Copy-paste-modify is fast once the pattern is established.
- **Over-engineering** — Not every feature needs all three layers. Simple features can have minimal contracts and infrastructure.
- **Barrel exports** — IDE "go to definition" works through barrels. Source maps help in debugging.
