# AutoFood Delivery Operations Platform

> IA-first Dense UX Design System + Backend Design System + Database Design System

## Структура проекта

```text
src/
├── app/                    # Next.js App Router (thin API layer)
│   ├── api/               # HTTP routes — call module handlers
│   ├── (routes)/          # Pages
│   └── layout.tsx         # Root layout
├── modules/               # Clean Architecture modules (domain-driven)
│   ├── orders/            # Orders module
│   ├── customers/         # Customers module
│   ├── warehouse/         # Inventory & cooking logic
│   ├── menus/             # Menu & dish management
│   ├── billing/           # Transactions & finance
│   ├── auth/              # Authentication & authorization
│   ├── notifications/     # Notifications & chat
│   └── reports/           # Analytics & exports
├── views/                 # BFF / View API (screen aggregations)
├── contracts/             # API contracts (OpenAPI, request trees)
├── shared/                # Shared utilities (db, cache, logger, errors, validation, http)
├── components/ui/         # shadcn/ui components (Design System tokens)
├── components/admin/      # Admin-specific components
├── hooks/                 # React hooks
├── contexts/              # React contexts (language, settings)
├── types/                 # Global TypeScript types
├── lib/                   # Utilities (tambo, api-client, etc.)
├── middleware.ts          # Next.js middleware (auth, routing)
prisma/
  schema.prisma            # Database schema (Design System v1.0)
docs/
  design-system/           # Frontend Design System v2.0
  backend-design-system/   # Backend Design System v1.0
  db-design-system/        # Database Design System v1.0
```

## Три системы

### 1. Frontend Design System v2.0 — «Интуитивная плотность»

- **P0–P3 приоритеты**: критическое → частое → дополнительное → редкое
- **8px grid**: spacing scale, typography scale, color system (neutral + primary + semantic)
- **100 законов UX**: от физики экрана до WCAG AA
- **Компоненты**: кнопки, inputs, таблицы, карточки, модалки, toast
- **Алгоритм проектирования**: 7 шагов от wireframe до тестирования

### 2. Backend Design System v1.0 — «Чистая библиотека»

- **Modular Monolith + Clean/Hexagonal Architecture**
- **CQRS-lite**: команды (write) отдельно от запросов (read)
- **BFF/View API**: один endpoint для экрана, 15 запросов → 1
- **B0–B3 приоритеты данных**: критическое → частое → дополнительное → тяжёлое
- **50 законов backend**: от архитектуры до observability
- **Resource budgets**: P95 latency, max payload, max DB queries per request

### 3. Database Design System v1.0 — «Чистое хранилище»

- **Access-pattern-first**: таблицы от домена, индексы от запросов
- **D0–D3 приоритеты**: критическое → частое → дополнительное → архив
- **Нейминг**: `idx_{table}_{columns}`, `uniq_{table}_{meaning}`, snake_case
- **Optimistic locking**: `version` на всех моделях
- **Soft delete**: `deletedAt` на всех моделях
- **Outbox pattern**: `outbox_events` для надёжных событий
- **50 законов DB**: от constraints до миграций

## Быстрый старт

```bash
# Install
yarn install

# Environment
cp .env.example .env.local
# Edit DATABASE_URL for your PostgreSQL

# Database
yarn prisma migrate dev
yarn prisma generate
yarn prisma db seed

# Dev
yarn dev

# Build
yarn build

# Tests
yarn test
yarn lint
yarn typecheck
```

## API

Base path: `/api/v1`

```text
GET    /api/v1/orders              — List orders (paginated, filtered)
GET    /api/v1/orders/:id          — Order detail
POST   /api/v1/orders              — Create order
PATCH  /api/v1/orders/:id          — Update order
POST   /api/v1/orders/:id:archive   — Archive order
POST   /api/v1/orders/:id:assign   — Assign courier
GET    /api/v1/customers           — List customers
GET    /api/v1/customers/:id       — Customer detail
GET    /api/v1/views/dashboard     — Dashboard view (BFF)
GET    /api/v1/views/order-detail  — Order detail view (BFF)
```

## Дизайн-токены

Все токены в `src/app/globals.css` и `tailwind.config.ts`:

- Spacing: `space-1` (4px) → `space-16` (64px)
- Typography: `text-xs` (12px) → `text-5xl` (56px)
- Colors: `neutral-50` → `neutral-950`, `primary-500` → `primary-800`, semantic: `success`, `warning`, `danger`, `info`
- Radius: `radius-sm` (4px) → `radius-full` (999px)
- Shadows: `shadow-xs` → `shadow-lg` (only for floating elements)
- Motion: `duration-fast` (150ms), `ease-out` (cubic-bezier)

## Контрибуция

1. Следуйте алгоритму проектирования из Design System (шаги 1–7)
2. Проверьте Definition of Done для страницы / endpoint’а / таблицы
3. Пишите тесты (unit + integration + contract)
4. Обновляйте документацию

## Лицензия

MIT
