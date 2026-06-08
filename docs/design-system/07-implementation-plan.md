# План имплементации дизайн-системы — Пошаговый

## Фаза 1: Frontend Foundation (1-2 дня)

### 1.1 Обновить globals.css — ДОДЕЛАТЬ
- [x] CSS custom properties уже добавлены
- [ ] Проверить что все shadcn/ui переменные используют дизайн-токены
- [ ] Убрать нео-брутализм тени из основных компонентов
- [ ] Заменить `--main: #fde047` на primary-500/600 токены

### 1.2 Обновить базовые UI компоненты (shadcn/ui)

#### Button (`src/components/ui/button.tsx`)
- [ ] Высота default: 40px (h-10), compact: 32px (h-8), large: 48px (h-12)
- [ ] Border-radius: 8px (rounded-lg)
- [ ] Padding: 10px 16px (default), 8px 12px (compact)
- [ ] Font-weight: 500/600
- [ ] Gap icon-text: 8px (gap-2)
- [ ] Primary: bg-primary-600, hover:bg-primary-700
- [ ] Secondary: bg-neutral-100, text-neutral-900
- [ ] Ghost: bg-transparent, hover:bg-neutral-100
- [ ] Danger: bg-danger, text-white
- [ ] Min tap zone: 44x44px (touch targets)

#### Input (`src/components/ui/input.tsx`)
- [ ] Высота default: 40px (h-10)
- [ ] Border-radius: 8px (rounded-lg)
- [ ] Border: neutral-300, focus: primary-600
- [ ] Error border: danger
- [ ] Padding: 10px 12px

#### Table (`src/components/ui/table.tsx`)
- [ ] Header row: 40px
- [ ] Default row: 44px
- [ ] Cell padding: 8px 12px
- [ ] Font: 14px (text-sm)
- [ ] Border: 1px neutral-200

#### Card (`src/components/ui/card.tsx`)
- [ ] Background: white
- [ ] Border: 1px solid neutral-200
- [ ] Radius: 12px (rounded-xl)
- [ ] Padding: 16px (compact), 24px (default)
- [ ] Убрать тяжёлые тени из базовой карточки

#### Dialog/Modal (`src/components/ui/dialog.tsx`)
- [ ] Small: max-w-[400px]
- [ ] Medium: max-w-[560px]
- [ ] Large: max-w-[720px]
- [ ] XL: max-w-[960px]
- [ ] Radius: 16px
- [ ] Primary action справа снизу

#### Badge (`src/components/ui/badge.tsx`)
- [ ] Radius: 999px (rounded-full)
- [ ] Font: 12px/500
- [ ] Варианты: success, warning, danger, info, neutral

### 1.3 Добавить недостающие состояния

Для каждого компонента страницы добавить:
- [ ] Loading state (skeleton/spinner)
- [ ] Empty state (с иконкой, текстом, кнопкой действия)
- [ ] Error state (с текстом ошибки и кнопкой Retry)
- [ ] Success state (после действия)

### 1.4 Обновить Layout компоненты

#### Sidebar (`src/components/layout/Sidebar.tsx`)
- [ ] Width: 280px, collapsed: 72px
- [ ] Nav item height: 40px
- [ ] Icon: 20px
- [ ] Gap icon-text: 12px
- [ ] Активный пункт: bg-primary-50, text-primary-700

#### MobileHeader (`src/components/layout/MobileHeader.tsx`)
- [ ] Height: 56px
- [ ] Hamburger menu
- [ ] Page title
- [ ] Primary action button

---

## Фаза 2: Frontend Pages (2-3 дня)

### 2.1 MIDDLE_ADMIN Dashboard
- [ ] Page header: Title + Primary action + Secondary actions
- [ ] Stats cards: compact, border-not-shadow
- [ ] Tab navigation: по дизайн-системе
- [ ] Все таблицы с 44px rows, 14px font

### 2.2 Orders Tab
- [ ] Фильтры над таблицей
- [ ] Статус-бейджи (семантические цвета)
- [ ] Cursor pagination
- [ ] Order detail modal (Medium width)
- [ ] Bulk actions toolbar

### 2.3 Clients Tab
- [ ] Table с plan badge, active/inactive badge
- [ ] Client detail modal/drawer
- [ ] Assignment set dropdown
- [ ] Bulk actions

### 2.4 Warehouse Tab
- [ ] Sub-tabs: Ингредиенты / Блюда / Сеты / План готовки
- [ ] Каждая подтаблица по дизайн-системе
- [ ] Create buttons в page header
- [ ] Double-click → edit modal (уже реализовано для SetsTab)

### 2.5 Finance Tab
- [ ] Balance cards сверху
- [ ] Transactions table
- [ ] Sub-tabs для зарплат/балансов

### 2.6 Dispatch Tab
- [ ] Map + sidebar layout
- [ ] Courier cards
- [ ] Route optimization button

### 2.7 Courier Dashboard
- [ ] Mobile-first layout
- [ ] Current order card
- [ ] Action buttons: Доставлено / Не удалось
- [ ] Bottom navigation

### 2.8 Customer Portal
- [ ] Public menu page
- [ ] Auth flow (OTP)
- [ ] Order form
- [ ] Order history

---

## Фаза 3: Backend Refactoring (3-5 дней)

### 3.1 Структура модулей

Создать директорию `src/modules/`:

```
src/modules/
├── auth/
│   ├── api/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── contracts/
├── admins/
├── clients/
├── orders/
├── warehouse/
│   ├── ingredients/
│   ├── dishes/
│   ├── sets/
│   └── cooking-plans/
├── finance/
├── dispatch/
├── couriers/
├── websites/
├── chat/
└── shared/
    ├── auth/
    ├── db/
    ├── cache/
    ├── errors/
    ├── logger/
    ├── validation/
    └── http/
```

### 3.2 Shared Error Handling
- [ ] Создать `src/modules/shared/errors/` с AppError классом
- [ ] Стандартный формат: `{ error: { code, message, details, requestId } }`
- [ ] Глобальный error handler middleware
- [ ] Все error codes из DTO документа

### 3.3 Shared Middleware
- [ ] requestId middleware (генерация уникального ID)
- [ ] Structured logger middleware
- [ ] Request/response logging с durationMs
- [ ] Slow query detection

### 3.4 Миграция API routes
- [ ] Создать `/api/v1/` префикс (Next.js rewrite)
- [ ] Перенести endpoint'ы по одному с новым форматом
- [ ] Оставить старые routes как proxy/redirect на время миграции

### 3.5 Repository Pattern
- [ ] Создать repositories для каждой сущности
- [ ] Нет SELECT * — только нужные колонки
- [ ] Cursor pagination helper
- [ ] N+1 detection/prevention

---

## Фаза 4: Database Refactoring (2-3 дня)

### 4.1 Prisma Schema Updates
- [ ] Добавить version, updatedAt, deletedAt где нужно
- [ ] Миграция JSON → related tables (dish_ingredients, menu_set_groups)
- [ ] Добавить составные индексы

### 4.2 Access Pattern Validation
- [ ] Проверить каждый access pattern с EXPLAIN ANALYZE
- [ ] Добавить недостающие индексы
- [ ] Убрать неиспользуемые индексы

### 4.3 Read Models
- [ ] customer_stats
- [ ] order_status_counts
- [ ] admin_stats
- [ ] Обновлять через triggers или application events

---

## Фаза 5: Observability (1 день)

### 5.1 Request Logging
- [ ] Каждый request логирует: method, route, status, durationMs, dbQueries, userId, requestId

### 5.2 Query Logging
- [ ] Prisma middleware для slow query detection
- [ ] Логировать queries > 100ms

### 5.3 Health Checks
- [ ] `/api/health` → DB connection, Redis (if any), external services

---

## Фаза 6: Testing & DoD (1-2 дня)

### 6.1 Проверка DoD для каждой страницы
- [ ] Понятно, где пользователь находится
- [ ] Есть H1
- [ ] Есть главное действие
- [ ] Все отступы из spacing scale
- [ ] Все цвета из tokens
- [ ] Есть loading/empty/error state
- [ ] Работает keyboard navigation
- [ ] Контраст WCAG AA

### 6.2 Проверка DoD для каждого endpoint
- [ ] Есть понятная причина существования
- [ ] Request/response описан
- [ ] Есть validation
- [ ] Есть authorization
- [ ] Нет business logic в controller
- [ ] Есть DTO, не DB entity
- [ ] Есть pagination для list
- [ ] Нет SELECT *
- [ ] Нет N+1
- [ ] Есть error codes
- [ ] Есть requestId

### 6.3 Проверка DoD для каждой таблицы
- [ ] Есть primary key
- [ ] Есть foreign keys
- [ ] Есть NOT NULL где нужно
- [ ] Есть created_at/updated_at
- [ ] Описаны access patterns
- [ ] Добавлены индексы
