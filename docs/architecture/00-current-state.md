# Architecture Baseline — Current State

> Snapshot of the AutoFood codebase as of June 2026, before the 20-step refactor begins.

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
| CI/CD | Vercel (no GitHub Actions yet) |
| Package Manager | Yarn 4.10 (Plug'n'Play) |

## 2. Current Directory Structure (simplified)

```
ok/src/
├── app/                    # Next.js App Router
│   ├── api/                # ~90 API route files (all inline Prisma)
│   │   ├── admin/          # 45+ admin routes (finance, warehouse, orders, clients, etc.)
│   │   ├── auth/           # NextAuth + login/signup
│   │   ├── chat/           # Chat messages, conversations
│   │   ├── courier/        # Courier location, orders, stats, route
│   │   ├── cron/           # Scheduled jobs (scheduler, trial check)
│   │   ├── customers/      # Customer profile, orders, auth, plan
│   │   ├── sites/          # Multi-tenant subdomain routes
│   │   ├── ai/             # AI chat
│   │   ├── system/         # Auto-scheduler
│   │   └── health/         # Health check
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
│   └── admin-dashboard/    # Shell, tabs, model (partial extraction)
├── hooks/                  # usePWA, useSiteConfig, useAdminSettings, use-mobile
├── lib/                    # ~30 utility modules (shared logic)
│   ├── admin/              # Admin-specific helpers
│   ├── ai/                 # AI utilities
│   ├── api/                # API helpers
│   ├── tambo/              # Tambo AI utilities
│   ├── auth-utils.ts
│   ├── customer-auth.ts
│   ├── db.ts               # Prisma client singleton
│   ├── sms-provider.ts
│   ├── site-builder.ts
│   ├── translations.ts     # 76KB translation file
│   └── ...
├── modules/                # NEW — Clean Architecture modules (in progress)
│   ├── orders/             # Partially migrated
│   └── shared/             # Scaffolded but empty (auth, db, errors, http, logger, validation)
├── types/                  # Global TypeScript types
├── auth.ts                 # NextAuth v5 config
├── auth.config.ts
└── middleware.ts           # Next.js middleware (auth, subdomain routing)
```

## 3. Key Problems

### 3.1. Monolith Component
`AdminDashboardPage.tsx` is ~4100 lines containing:
- All tab components (overview, orders, customers, finance, warehouse, admins, chat, map, settings)
- All state management (20+ useState/useMemo hooks)
- All data fetching logic
- All inline handlers

This caused a TDZ `ReferenceError: Cannot access 'eB' before initialization` on Vercel (minified build). Fixed by reordering variable declarations, but the root cause — excessive component size — remains.

### 3.2. Inline API Routes
All ~90 API route files contain:
- Inline Prisma queries (no repository layer)
- Mixed auth/validation/business logic
- No shared HTTP wrapper (each route repeats try/catch, auth checks, response formatting)
- No DTO layer (return raw Prisma entities)
- N+1 queries in customer/order list endpoints
- No cursor pagination
- No request ID tracing

### 3.3. Shared Module Duplication
- `src/lib/` has ~30 utility modules with business logic
- `src/modules/shared/` was scaffolded with empty subdirectories (auth, db, errors, http, logger, validation)
- No clear boundary between what belongs in `lib/` vs `modules/shared/`

### 3.4. No CI/CD Pipeline
- No GitHub Actions workflows
- No secret scanning
- No automated testing on push/PR
- No lint/typecheck gates

### 3.5. Missing Observability
- No structured logging
- No request ID tracing
- No performance budgets
- No error tracking integration

## 4. API Route Inventory

| Domain | Route Count | Key Endpoints |
|---|---|---|
| Admin | 45+ | `/admin/orders/*`, `/admin/clients/*`, `/admin/finance/*`, `/admin/warehouse/*`, `/admin/dispatch/*` |
| Auth | 3 | `/auth/[...nextauth]`, `/auth/login`, `/auth/signup` |
| Customers | 8 | Profile, orders, auth, plan, today-menu |
| Courier | 7 | Orders, location, stats, route, profile, withdraw |
| Chat | 4 | Conversations, messages, send, users |
| Sites | 4 | Subdomain CRUD, site auth (login, register, verify-code) |
| Cron | 2 | Scheduler, trial check |
| AI | 1 | Chat |
| System | 1 | Auto-scheduler |
| Health | 1 | Health check |

## 5. Module Migration Status

| Module | Status | Notes |
|---|---|---|
| `modules/orders/` | Partial | Some structure exists but incomplete |
| `modules/shared/` | Scaffolded | 6 empty subdirectories |
| All other modules | Not started | Business logic lives in `lib/` and API routes |

## 6. Security Posture (before refactor)

| Area | Status |
|---|---|
| Auth | next-auth v5 + Google OAuth (working) |
| Secret scanning | None |
| `.env.example` | Exists with all 30+ vars documented |
| `.gitignore` secrets | Partial (added `credentials*`, `service-account*.json`, `secrets/`) |
| Input validation | Ad-hoc in individual routes |
| Rate limiting | None |
| Audit logging | Minimal (action-logs endpoint exists) |
| CORS | Default Next.js |
| Request ID | None |
