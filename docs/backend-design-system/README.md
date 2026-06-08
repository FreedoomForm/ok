# Backend Design System v1.0
## «Чистая библиотека»

Главная цель:

> **Backend должен выглядеть не как папка с хаотичными controller/service/utils, а как хорошо собранная библиотека возможностей.**

Разработчик открывает проект и быстро понимает:

```text
gde API
gde business-logika
gde baza
gde kesh
gde kontrakty
gde oshibki
gde testy
kak dobavit' novuyu funktsiyu
kak ne slomat' staruyu
```

---

## 0. Главная формула backend'а

```text
Ponyatny backend =
Domain Tree
+ API Tree
+ Request Tree
+ Data Access Rules
+ Resource Budgets
+ Contracts
+ Observability
```

Ресурсная эффективность:

```text
Horoshaya effektivnost' = nuzhnye dannye / minimum zaprosov, CPU, RAM, IO, payload

Plokhaya effektivnost' = mnogo endpoint'ov + N+1 + lishnie polya + tyazhyolye JOIN + net kesh'a
```

Главное правило:

> **Каждый backend-запрос должен иметь понятную причину существования.**

---

## 1. Какой стиль архитектуры брать по умолчанию

Для большинства проектов:

> **Modular Monolith + Clean/Hexagonal Architecture + API-first + CQRS-lite + BFF/View API при необходимости.**

### 1.1. Modular Monolith
Не микросервисы сразу, а один backend, но внутри разделённый на модули.

```text
src/modules/
├── users/
├── customers/
├── orders/
├── warehouse/
├── menus/
├── billing/
├── notifications/
└── reports/
```

Почему так:
- меньше DevOps-сложности
- проще транзакции
- меньше сетевых вызовов
- легче дебажить
- можно потом вынести модуль в сервис

### 1.2. Clean / Hexagonal Architecture
Внутри каждого модуля:

```text
api -> application -> domain <- infrastructure
```

- `api` — HTTP, controllers, routes, schemas
- `application` — use cases, commands, queries
- `domain` — бизнес-правила
- `infrastructure` — база, Redis, внешние API, очереди

> Бизнес-логика не должна жить в controller'ах.

### 1.3. CQRS-lite
Разделение:

```text
Commands = izmenit' sostoyanie
Queries = prochitat' dannye
```

Примеры:
```text
CreateOrderCommand
UpdateOrderStatusCommand
GetOrderDetailQuery
ListCustomerOrdersQuery
```

### 1.4. BFF / View API
Если экрану нужно 5–10 разных запросов, лучше сделать один агрегирующий endpoint:

```text
GET /api/v1/views/order-detail/{orderId}?sections=main,audit,stats
```

Но важно: View API не должен становиться мусорным mega-controller'ом. Он только собирает данные из нормальных domain-use-cases.

---

## 2. Приоритеты данных: B0 / B1 / B2 / B3

### B0 — критические данные
Без них экран или действие невозможны.

- текущий пользователь / админ
- права доступа
- основная сущность страницы (order, customer)
- статус объекта
- обязательные поля формы

**Правило:** B0 грузится первым, быстро, стабильно, без тяжёлых вычислений.

### B1 — частые данные
Нужны почти всегда, но не всегда блокируют экран.

- список последних заказов
- краткая статистика
- customer summary
- счётчики
- статусы

**Правило:** B1 можно включать через `include`, кэшировать, batch'ить.

### B2 — дополнительные данные
Нужны иногда.

- история изменений
- комментарии / аудит
- расширенные настройки
- вторичные табы

**Правило:** B2 грузится lazy: по вкладке, раскрытию, drawer'у.

### B3 — редкие / тяжёлые данные
Примеры: audit log, export, отчёты, архив, админские операции.

**Правило:** B3 уходит в отдельный endpoint, background job или export.

---

## 3. Backend строится из 5 деревьев

### 3.1. Domain Tree
Что есть в системе по смыслу.

```text
AutoFood Delivery
├── Organization (Admin)
├── Members (Admins, Couriers, Workers)
├── Customers
│   ├── Orders
│   ├── Transactions
│   └── Auto-Orders
├── Warehouse (Items, Stock)
├── Menus / Dishes / MenuSets
├── Billing (Transactions, Salaries)
├── Website (Landing Pages)
├── Chat (Conversations, Messages)
└── Reports / Analytics
```

### 3.2. API Tree
Публичные пути backend'а.

```text
/api/v1
├── /auth
├── /me
├── /customers
├── /orders
├── /warehouse
├── /menus
├── /dishes
├── /menu-sets
├── /transactions
├── /reports
├── /chat
├── /views
└── /jobs
```

### 3.3. Request Tree
Какие данные нужны конкретному экрану.

Пример: Dashboard страница админа
```text
Dashboard Page
├── B0: current admin summary
├── B0: permissions
├── B1: today orders preview
├── B1: counters (orders, customers, revenue)
├── B2: courier live map
├── B2: recent audit events
└── B3: full monthly report
```

### 3.4. Data Tree
Какие таблицы реально участвуют.

```text
dashboard_view
├── admins
├── orders
├── customers
├── transactions
└── admin_stats_read_model
```

### 3.5. Job / Event Tree
Что происходит после изменения.

```text
order.created
├── update_customer_balance
├── notify_courier
├── write_order_audit_event
├── update_daily_stats
└── send_webhook
```

---

## 4. Базовое дерево API

### 4.1. Правила API paths
- **Используй существительные:** `GET /orders`, `GET /orders/{orderId}`
- **Версия API обязательна:** `/api/v1/orders`
- **Вложенность максимум 2 уровня:** `GET /orders/{orderId}/audit-events`
- **Глубокая вложенность → фильтры:** `GET /audit-events?orderId=123`
- **Actions отдельно:** `POST /orders/{orderId}:archive`, `POST /orders/{orderId}:complete`
- **List endpoint всегда имеет фильтры, сортировку и limit:** `GET /orders?status=open&sort=-createdAt&limit=50&cursor=abc`

### 4.2. List endpoint обязательные параметры
```text
limit (default 25, max 100)
cursor / page
sort
filters
```

Нельзя: `GET /orders` возвращать 50 000 записей.

---

## 5. Request Tree — сердце системы

Главная идея:

> Для каждого экрана заранее описывается дерево backend-запросов: что нужно сразу, что можно позже, что кэшируется, что batch'ится.

Пример:
```text
GET /api/v1/views/order-detail/{orderId}?sections=main,audit,stats
```

Request tree:
```text
order-detail
├── main [B0]
│   ├── order.summary
│   ├── currentUser.permissions
│   └── customer.summary
├── audit [B2]
│   └── orderAuditEvents.list limit=20
└── stats [B1]
    └── order.stats.readModel
```

### 5.1. Формат request contract (YAML)
```yaml
view: order-detail
route: GET /api/v1/views/order-detail/{orderId}

budget:
  p95Ms: 450
  maxPayloadKb: 150
  maxDbQueries: 8

sections:
  main:
    priority: B0
    required: true
    nodes:
      - id: order
        useCase: orders.getSummary
        fields: [id, orderNumber, status, customerId, updatedAt]
        cache: { ttlSec: 30 }
      - id: permissions
        useCase: orders.getCurrentUserPermissions
        cache: { ttlSec: 15 }
      - id: customer
        useCase: customers.getSummary
        dependsOn: [order.customerId]
        fields: [id, name, phone]
        cache: { ttlSec: 300 }
  audit:
    priority: B2
    lazy: true
    nodes:
      - id: auditEvents
        useCase: orderAuditEvents.listByOrder
        params: { limit: 20 }
```

### 5.2. Алгоритм выполнения request tree
```text
1. Prinyat' zapros
2. Proverit' auth
3. Proverit' prava
4. Prochitat' sections
5. Postroit' derevo zavisimostey
6. Udalit' nenuzhnye vetki
7. Proverit' cache
8. Sgruppirovat' odnakovy zaprosy
9. Vypolnit' nezavisimye nodes parallel'no
10. Ogranicit' concurrency
11. Sobrat' response
12. Zapisat' metrics / logs
```

---

## 6. Response structure

### 6.1. Success
```json
{
  "data": {
    "id": "ord_123",
    "orderNumber": 42
  },
  "meta": { "requestId": "req_123" }
}
```

### 6.2. List response
```json
{
  "data": [ { "id": "ord_1", "status": "open" } ],
  "meta": {
    "requestId": "req_123",
    "page": { "limit": 20, "nextCursor": "abc", "hasMore": true }
  }
}
```

### 6.3. Error response
```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Zakaz ne nayden",
    "details": { "orderId": "ord_123" },
    "requestId": "req_123"
  }
}
```

Правила ошибки:
```text
code — stable machine code
message — human-readable text
details — safe context
requestId — for log search
```

---

## 7. DTO уровни

Не возвращай одну огромную модель всегда. Делай уровни:

```text
OrderSummary
OrderListItem
OrderDetail
OrderAdminDetail
OrderExportRow
```

Правило: **List endpoint не должен возвращать Detail DTO.**

---

## 8. `fields` и `include`

Для экономии payload'а:
```text
GET /orders/123?fields=id,orderNumber,status
GET /orders/123?include=customerSummary,stats
```

Правила:
1. `fields` — только whitelist.
2. `include` — только заранее разрешённые значения.
3. `include` возвращает summary, не огромную вложенную сущность.
4. Максимальная глубина include — 1.
5. Тяжёлые include запрещены, для них отдельный endpoint.
6. `include=all` запрещён.

---

## 9. Главное правило против backend-мусора

Плохо:
```text
Frontend:
GET /orders
GET /orders/1/customer
GET /orders/1/stats
GET /orders/1/audit
GET /customers/1
GET /admins/2
...
```

Хорошо:
```text
GET /views/order-detail/1?sections=main,audit,stats
```

или:
```text
GET /orders/1?include=customerSummary,stats
GET /orders/1/audit-events?limit=20
POST /customers:batch-get
```

> Если frontend вынужден собирать страницу из 15 запросов — backend не сделал свою работу.

---

## 10. Структура проекта как библиотека

```text
src/
├── app/
│   ├── bootstrap
│   ├── config
│   ├── server
│   └── container
│
├── modules/
│   ├── orders/
│   │   ├── api/
│   │   │   ├── orders.routes.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.schemas.ts
│   │   │   └── orders.presenter.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── create-order.command.ts
│   │   │   │   └── archive-order.command.ts
│   │   │   ├── queries/
│   │   │   │   ├── get-order-detail.query.ts
│   │   │   │   └── list-orders.query.ts
│   │   │   └── services/
│   │   ├── domain/
│   │   │   ├── order.entity.ts
│   │   │   ├── order.policy.ts
│   │   │   ├── order.errors.ts
│   │   │   └── order.events.ts
│   │   ├── infrastructure/
│   │   │   ├── order.repository.ts
│   │   │   ├── order.mapper.ts
│   │   │   └── order.read-model.ts
│   │   ├── contracts/
│   │   │   ├── order.dto.ts
│   │   │   └── order.schema.ts
│   │   ├── tests/
│   │   ├── public/
│   │   └── README.md
│   ├── customers/
│   ├── warehouse/
│   ├── billing/
│   └── notifications/
│
├── views/
│   ├── dashboard.view.ts
│   ├── order-detail.view.ts
│   └── request-tree.executor.ts
│
├── shared/
│   ├── auth/
│   ├── db/
│   ├── cache/
│   ├── queue/
│   ├── logger/
│   ├── errors/
│   ├── http/
│   ├── validation/
│   └── utils/
│
├── contracts/
│   ├── openapi.yaml
│   ├── views/
│   │   ├── dashboard.yaml
│   │   └── order-detail.yaml
│   └── events/
│
└── tests/
    ├── integration/
    ├── contract/
    └── e2e/
```

---

## 11. Правила слоёв

### API layer
**Можно:** validate request, parse params, call use case, format response.  
**Нельзя:** business logic, SQL queries, authorization rules hidden in controller.

### Application layer
**Можно:** orchestrate use cases, start transaction, call repositories, call policies, publish events.  
**Нельзя:** HTTP-specific logic, UI decisions.

### Domain layer
**Можно:** business rules, entities, value objects, domain events, policies, domain errors.  
**Нельзя:** HTTP, database, Redis, framework imports.

### Infrastructure layer
**Можно:** SQL, ORM, Redis, external API, message broker, file storage.

---

## 12. Data access rules

- **Никакого `SELECT *`** — выбирай только нужные колонки.
- **Никакого N+1** — batch-загрузка связанных сущностей.
- **Индекс под каждый частый фильтр** — если есть endpoint `GET /orders?status=open&sort=-createdAt`, значит нужен индекс.
- **Cursor pagination по умолчанию** — `limit + cursor`, не `offset`.
- **Count осторожно** — не делать `COUNT(*)` по огромной таблице на каждый list. Используй `hasMore`, `approximateCount`, `cachedCount`.

---

## 13. Resource budgets

| Метрика | Default |
|---|---|
| P95 простого read | 200–300ms |
| P95 сложного view | 400–600ms |
| Write request | 300–700ms |
| Heavy operation | 202 + background job |
| Max list limit | 100 |
| Default list limit | 20–50 |
| Max response P0 | 100–200KB |
| Slow DB query | 100–200ms |
| Max DB queries на request | 5–10 |
| Max request body | 512KB–2MB |
| Export / report | async job |

> Если endpoint не проходит budget — он не готов.

---

## 14. Caching strategy

### Уровни кэша
```text
L0: request memoization
L1: application memory cache
L2: Redis / cache storage
L3: CDN / HTTP cache
L4: precomputed read models
```

### Что кэшировать
Хорошо: справочники, настройки, public content, summary DTO, read models, stats.  
Плохо: часто меняющиеся балансы, критичные permission checks без versioning, персональные данные без user/tenant key.

### Cache key
```text
{env}:{module}:{resource}:{id}:{version}:{fieldsHash}:{userOrTenantScope}
```

Пример: `prod:orders:summary:ord_123:v4:fields_ab12:admin_77`

### Правила
1. Нет кэша без TTL.
2. Нет кэша без owner'а.
3. Нет кэша без стратегии invalidation.
4. Private cache key учитывает user/tenant/permissions.
5. Cache hit/miss логируется.
6. Кэш — не замена нормальным индексам.

---

## 15. Batching

Batch нужен, когда много однотипных запросов.

Плохо:
```text
GET /customers/1
GET /customers/2
GET /customers/3
```

Хорошо:
```text
POST /customers:batch-get
```
Body:
```json
{ "ids": ["cus_1", "cus_2", "cus_3"], "fields": ["id", "name", "phone"] }
```

Response:
```json
{ "data": { "cus_1": { "id": "cus_1", "name": "A" }, "cus_2": { "id": "cus_2", "name": "B" } } }
```

Правила:
- Batch endpoints для внутренних / BFF сценариев.
- Ограничь max ids (например, 100).
- Лучше map по id, если порядок не важен.
- Batch не должен обходить permissions.

---

## 16. Async jobs

Если операция долгая — не держи HTTP request.

```text
POST /reports/{reportId}:export
```
Response:
```json
{ "data": { "jobId": "job_123", "status": "queued" } }
```

Потом:
```text
GET /jobs/job_123
```

Правила:
- Всё дольше 1–2 секунд — кандидат в job.
- Job должен иметь status, retry policy, idempotency.
- Ошибка job должна быть читаемой.
- Большие файлы — object storage/CDN, не через backend memory.

---

## 17. Events / Outbox

После изменения состояния часто нужны побочные эффекты.

```text
order.created
├── update_customer_stats
├── send_notification
├── write_audit
└── send_webhook
```

Правило: не смешивай основную транзакцию и побочные эффекты хаотично.

Для надёжности:
```text
DB transaction
├── save order
├── save outbox event
└── commit

worker
├── read outbox
├── publish event
└── mark as published
```

Таблица `outbox_events` уже есть в схеме.

---

## 18. Security baseline

Backend не считается готовым без этого:
```text
auth
authorization
input validation
rate limiting
audit log
safe errors
secret management
```

### AuthN / AuthZ
Разделяй:
```text
Authentication = kto ty?
Authorization = chto tebe mozhno?
```

Плохо: `if user exists -> allow`.  
Хорошо: `policy.canEditOrder(user, order)`.

### Permissions должны быть централизованы
```text
modules/orders/domain/order.policy.ts
```

Не размазывать права по controller'ам.

### Multi-tenant rule
Если есть организации/аккаунты: каждый запрос к данным должен учитывать `adminId` / `createdBy`. Это должно проверяться на уровне repository/policy, а не только в UI.

---

## 19. Observability

Backend должен объяснять, что с ним происходит.

Обязательно:
```text
structured logs
requestId
traceId
metrics
slow query logs
error tracking
audit logs
health checks
```

### Каждый request логирует
```json
{
  "level": "info",
  "requestId": "req_123",
  "method": "GET",
  "route": "/api/v1/orders/{orderId}",
  "status": 200,
  "durationMs": 83,
  "dbQueries": 3,
  "cacheHits": 2,
  "cacheMisses": 1,
  "userId": "adm_123"
}
```

### Не логировать
```text
password, access token, refresh token, credit card, private keys, secret headers, full personal data
```

---

## 20. Testing strategy

Минимальный набор:
```text
unit tests
integration tests
contract tests
e2e smoke tests
migration tests
performance smoke tests
```

### Что тестировать где
| Тип | Что проверяет |
|---|---|
| Unit | domain rules, policies, mappers |
| Integration | repositories, database, cache |
| Contract | request/response schema |
| E2E | основные пользовательские сценарии |
| Load smoke | P0 endpoints under budget |
| Migration | база мигрирует без поломки |

---

## 21. Documentation

Backend как библиотека должен иметь документацию.

```text
docs/backend/
├── 00-principles.md
├── 01-domain-tree.md
├── 02-api-tree.md
├── 03-request-trees.md
├── 04-errors.md
├── 05-events.md
├── 06-cache.md
├── 07-security.md
└── 08-scaling.md
```

Обязательно:
```text
OpenAPI / Swagger
request tree contracts
error codes
event contracts
module README
database schema docs
```

---

## 22. Naming conventions

### API routes
`kebab-case`:
```text
/orders
/order-audit-events
/admin-dashboard
```

### JSON
`camelCase`:
```json
{ "createdAt": "2026-06-08T12:00:00Z", "ownerId": "adm_123" }
```

### Database
`snake_case`:
```text
created_at, owner_id, order_audit_events
```

### Error codes
`UPPER_SNAKE_CASE`:
```text
ORDER_NOT_FOUND
TASK_ALREADY_COMPLETED
PERMISSION_DENIED
VALIDATION_FAILED
```

### Events
Прошедшее время:
```text
order.created
task.completed
invoice.paid
user.invited
```

---

## 23. Backend config tokens

```yaml
backend:
  http:
    apiPrefix: /api/v1
    requestTimeoutMs: 3000
    viewTimeoutMs: 5000
    maxBodyKb: 1024
    compression: true

  pagination:
    defaultLimit: 25
    maxLimit: 100
    cursorBased: true

  performance:
    slowRequestMs: 500
    slowQueryMs: 150
    maxDbQueriesPerRequest: 10
    maxResponseKb: 300

  cache:
    enabled: true
    defaultTtlSec: 60
    dictionaryTtlSec: 3600
    listTtlSec: 15
    detailTtlSec: 60
    permissionsTtlSec: 15

  jobs:
    defaultTimeoutSec: 300
    maxRetries: 3
    retryBackoff: exponential

  security:
    rateLimitPerMinute: 120
    requireRequestId: true
    auditDangerousActions: true

  observability:
    logs: json
    metrics: true
    tracing: true
    healthcheckPath: /health
```

---

## 24. Алгоритм проектирования backend'а

1. **Выпиши top actions** (10 главных задач пользователя).
2. **Построй Domain Tree** (сущности и связи).
3. **Построй API Tree** (публичные пути).
4. **Для каждого экрана сделай Request Tree** (B0/B1/B2/B3).
5. **Определи DTO** (Summary, ListItem, Detail).
6. **Определи query plan** (таблицы, индексы, N+1, cache).
7. **Определи resource budget** (latency, payload, queries).
8. **Реализуй модуль** (api/application/domain/infrastructure/tests/README).
9. **Добавь observability** (logs, metrics, traces).
10. **Проверь DoD**.

---

## 25. Definition of Done для endpoint'а

```text
[ ] есть понятная причина существования
[ ] endpoint есть в API tree
[ ] request/response описан в contract
[ ] есть validation input
[ ] есть authorization
[ ] нет business logic в controller
[ ] есть DTO, не отдаётся DB entity напрямую
[ ] есть pagination для list
[ ] есть limit max
[ ] нет SELECT *
[ ] нет N+1
[ ] есть нужные индексы
[ ] есть error codes
[ ] есть requestId в response/logs
[ ] есть unit/integration/contract tests
[ ] есть logs/metrics
[ ] endpoint проходит performance budget
[ ] обновлена документация
```

---

## 26. Definition of Done для модуля

```text
[ ] имеет README
[ ] имеет public API
[ ] имеет api/application/domain/infrastructure
[ ] не импортирует чужие internals
[ ] имеет свои errors
[ ] имеет свои DTO/contracts
[ ] имеет tests
[ ] имеет migrations (если нужны)
[ ] имеет events, если нужны
[ ] имеет policies/permissions
[ ] имеет monitoring metrics
```

---

## 27. 50 senior-законов backend'а

### Архитектура
1. Backend должен быть понятен по дереву папок.
2. Модуль должен выглядеть как библиотека.
3. Controller не место для бизнес-логики.
4. Domain не должен знать про HTTP.
5. Infrastructure не должна диктовать бизнес-правила.
6. Не начинай с микросервисов без причины.
7. Modular monolith лучше хаотичного distributed mess.
8. Границы модулей важнее количества файлов.
9. Не делай abstraction ради abstraction.
10. Публичный contract важнее внутренней реализации.

### API
11. API path должен читаться как карта продукта.
12. Endpoint без владельца превращается в мусор.
13. List endpoint без pagination — баг.
14. `include=all` — почти всегда ошибка.
15. DTO не должен быть копией DB entity.
16. Ошибки должны иметь стабильные codes.
17. Версионирование API нужно до первой большой поломки.
18. Один термин — один смысл во всём backend'е.
19. Не смешивай admin API и user API без явной границы.
20. Public API должен быть документирован.

### Request tree
21. Экран должен иметь request tree.
22. B0 данные грузятся первыми.
23. B2/B3 данные не должны тормозить B0.
24. Если экран требует 15 запросов — нужен BFF/View API.
25. Одинаковые запросы должны dedup'иться.
26. Независимые nodes можно выполнять параллельно.
27. Зависимые nodes должны быть явно описаны.
28. У каждого node должен быть timeout.
29. У каждого view должен быть payload budget.
30. Partial response лучше полного падения из-за B2 блока.

### Performance
31. Сначала убери N+1, потом добавляй кэш.
32. Кэш не лечит плохую модель данных.
33. `SELECT *` — враг больших систем.
34. Индекс должен следовать за частым фильтром.
35. Большие exports должны быть async.
36. Большие файлы не должны проходить через RAM backend'а.
37. Count на больших таблицах должен быть осознанным.
38. Payload — это тоже ресурс.
39. Slow query должен быть виден в логах.
40. Performance budget должен быть частью DoD.

### Data
41. Транзакции должны быть короткими.
42. Миграции должны быть обратимыми или безопасными.
43. Схема базы — часть архитектуры, а не побочный эффект ORM.
44. Soft delete должен быть осознанным, не автоматическим мусором.
45. Audit log нужен для опасных действий.
46. Read model лучше тяжёлого JOIN на каждом запросе.
47. Денормализация допустима, если она документирована.
48. Data ownership должен быть понятен.
49. Multi-tenant фильтр нельзя доверять frontend'у.
50. Backup/restore — часть backend-системы.

---

## 28. Главное правило всей системы

Если сомневаешься, выбирай так:

```text
1. Безопасность данных
2. Понятность архитектуры
3. Корректность бизнес-логики
4. Минимум лишних запросов
5. Минимум payload
6. Наблюдаемость
7. Скорость разработки
8. Масштабируемость
```

---

## 29. Финальная структура мышления

Думай не так:
```text
"Mne nuzhen controller, service, repository"
```

А так:
```text
1. Kakaya pol'zovatel'skaya zadacha?
2. Kakoy ekran / action?
3. Kakie B0/B1/B2/B3 dannye nuzhny?
4. Kak vygladit request tree?
5. Kakie domain modules uchastvuyut?
6. Kakoy minimal'nyy DTO?
7. Kakie queries / cache / batch nuzhny?
8. Kak eto budet logirovat'sya i testirovat'sya?
```

Вот это и есть backend, который потом можно спокойно масштабировать.
