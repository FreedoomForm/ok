# Database Design System v1.0
## «Чистое хранилище»

Главная цель:

> **База данных должна быть не местом, куда backend "просто что-то сохраняет", а строгой библиотекой фактов, связей и быстрых путей доступа.**

---

## 0. Главная формула DB

```text
Понятная база =
Domain Data Tree
+ Schema Tree
+ Access Pattern Tree
+ Index Tree
+ Migration Tree
+ Data Lifecycle
+ Observability
```

Эффективность базы:

```text
Хорошая эффективность =
минимум строк прочитано
+ минимум колонок выбрано
+ правильный индекс
+ короткая транзакция
+ маленький payload
+ предсказуемый query plan
```

Плохая эффективность:

```text
SELECT *
+ N+1
+ нет индексов
+ OFFSET на миллионах строк
+ тяжёлый COUNT(*)
+ случайные JSON-поля
+ огромные JOIN без нужды
```

---

## 1. Какой подход брать по умолчанию

Для большинства SaaS/dashboard/marketplace/backend-систем:

> **PostgreSQL / SQL-first + нормализованная write-model + денормализованные read-models там, где нужно.**

Правило senior-разработчика:

> **Таблицы проектируются от домена.  
> Индексы проектируются от запросов.  
> Read models проектируются от экранов.**

То есть:

```text
Domain → таблицы
Request Tree → access patterns
Access Patterns → индексы
Тяжёлые экраны → read models
```

---

## 2. Главный принцип

Не думай так:

```text
Мне нужна таблица users, потом как-нибудь разберёмся.
```

Думай так:

```text
1. Какие сущности существуют?
2. Кто владелец данных?
3. Какие связи между сущностями?
4. Какие запросы будут чаще всего?
5. Какие поля нужны каждому запросу?
6. Какой индекс обслуживает этот запрос?
7. Что будет при росте в 10x / 100x?
```

---

## 3. Шесть деревьев базы данных

### 3.1. Domain Data Tree

Что существует в продукте по смыслу.

```text
AutoFood Delivery
├── Organization (Admin / Middle Admin)
├── Members (Admins, Couriers, Workers)
├── Roles (SUPER_ADMIN, MIDDLE_ADMIN, LOW_ADMIN, COURIER, WORKER)
├── Customers (Clients)
│   ├── Orders
│   ├── Transactions (Balance)
│   └── Auto-Orders
├── Projects (MenuSets, Menus, Dishes)
│   ├── Tasks (Orders, Cooking Plans)
│   ├── Files (Assets, Attachments)
│   └── Activity (OrderAuditEvent, ActionLog)
├── Warehouse (WarehouseItem)
├── Billing (Transactions, DailyBalance)
├── Website (Landing)
└── Chat (Conversation, Message)
```

### 3.2. Schema Tree

Как это разложено по таблицам.

```text
public
├── admins
├── customers
├── orders
├── order_audit_events
├── action_logs
├── interface_configs
├── features
├── accounts
├── conversations
├── messages
├── websites
├── warehouse_items
├── daily_cooking_plans
├── menus
├── dishes
├── menu_sets
├── transactions
└── outbox_events
```

### 3.3. Access Pattern Tree

Какие реальные способы доступа к данным есть.

Пример для страницы заказа (Order Detail):

```text
Order Detail Page
├── D0: get order by id
├── D0: check current user admin rights
├── D1: get customer summary
├── D1: get courier summary
├── D1: get order audit events preview
├── D2: get full audit log
└── D3: get related transactions
```

### 3.4. Query Tree

Какие SQL-запросы реально выполняются.

```text
order-detail
├── q1: select order summary
├── q2: select customer summary
├── q3: select admin/courier summary (batch)
├── q4: select order audit events (limit 20)
├── q5: select cooking plan for date
└── q6: select transactions (lazy, D3)
```

### 3.5. Index Tree

Какой индекс обслуживает какой access pattern.

```text
orders
├── pk_orders_id (id)
├── uniq_orders_order_number (orderNumber)
├── idx_orders_admin_delivery_status (adminId, deliveryDate, orderStatus)
├── idx_orders_courier_delivery (courierId, deliveryDate)
├── idx_orders_customer_created (customerId, createdAt)
├── idx_orders_customer (customerId)
└── idx_orders_status_created (orderStatus, createdAt)

customers
├── pk_customers_id (id)
├── uniq_customers_phone_created_by_deleted (phone, createdBy, deletedAt)
├── idx_customers_created_by_active_created (createdBy, isActive, createdAt)
├── idx_customers_default_courier (defaultCourierId)
├── idx_customers_assigned_set (assignedSetId)
└── idx_customers_created_at (createdAt)
```

### 3.6. Lifecycle Tree

Что происходит с данными со временем.

```text
hot data (0–90 дней)
├── active orders
├── active customers
├── recent audit events
├── messages

warm data (90 дней – 2 года)
├── completed orders
├── old transactions
├── historical cooking plans

cold data (2+ года)
├── archived customers
├── old audit logs
├── old action logs
├── old outbox events
```

---

## 4. D0 / D1 / D2 / D3 приоритеты данных

### D0 — критические данные

Без них нельзя выполнить действие.

- user / admin
- organization / admin membership (createdBy)
- order core row
- permissions / role
- customer identity
- payment status

**Правила:**
- D0 должен быть быстрым (< 30ms indexed lookup)
- D0 должен иметь строгие constraints (NOT NULL, FK, CHECK)
- D0 не должен зависеть от тяжёлых JOIN
- D0 не должен лежать в мутном JSON

### D1 — частые данные

Нужны почти всегда.

- order list item
- customer list item
- short admin profile (courier, manager)
- order stats / counters
- menu / dish list

**Правила:**
- D1 оптимизируется индексами
- D1 можно хранить в read model
- D1 должен возвращать только нужные поля (не SELECT *)

### D2 — дополнительные данные

Нужны иногда.

- activity feed / audit log
- messages
- website config / interface config
- cooking plan details
- warehouse item details

**Правила:**
- D2 грузится отдельно / lazy
- D2 не должен тормозить D0/D1

### D3 — тяжёлые / редкие данные

- export CSV
- full audit log
- analytics
- old archive
- report generation

**Правила:**
- D3 отдельно
- D3 часто async
- D3 можно партиционировать
- D3 можно уносить в OLAP / ClickHouse

---

## 5. Базовая структура таблицы (обязательные поля)

Для бизнес-сущностей по умолчанию:

```sql
CREATE TABLE example (
  id              UUID PRIMARY KEY,          -- стабильный primary key
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,                -- soft delete, если нужен lifecycle
  version         INTEGER NOT NULL DEFAULT 1, -- optimistic locking
  ...business fields...
);
```

Базовые поля:

| Поле | Зачем |
|---|---|
| `id` | стабильный primary key |
| `created_at` | когда создано |
| `updated_at` | когда изменено |
| `deleted_at` | soft delete, если нужен |
| `version` | optimistic locking |
| `status` | lifecycle-состояние (если применимо) |
| `organization_id` / `tenant_id` | владелец данных (multi-tenant) |

---

## 6. Naming conventions

### Таблицы
`snake_case`, plural.

```text
admins
customers
orders
order_audit_events
warehouse_items
```

### Колонки
`snake_case`.

```text
id
organization_id
project_id
owner_id
created_at
updated_at
deleted_at
is_active
```

### Индексы
```text
idx_{table}_{columns}_{suffix?}
uniq_{table}_{meaning}
```

Примеры:
```text
idx_orders_admin_delivery_status
idx_customers_created_by_active_created
uniq_customers_phone_created_by_deleted
```

---

## 7. ID strategy

| Тип | Когда использовать |
|---|---|
| `UUID` / `cuid()` | распределённые системы, публичные id |
| `UUIDv7/ULID` | лучше для сортировки по времени |
| `BIGSERIAL` | внутренняя high-load таблицы |
| `TEXT external_id` | id из внешней системы |

Рекомендация по умолчанию: **UUID** (`cuid()`) для публичных бизнес-сущностей.

> Не показывай внутренний автоинкремент там, где это может раскрывать количество объектов или давать предсказуемый перебор.

---

## 8. Типы данных

### Деньги
Плохо: `amount FLOAT`.  
Хорошо: `amount_cents BIGINT` или `NUMERIC(12,2)` + `currency CHAR(3)`.

### Время
Всегда `TIMESTAMPTZ` (UTC). В UI форматируем под timezone пользователя.

### Статусы
Для часто меняющихся статусов: `status TEXT NOT NULL CHECK (...)`.  
Для стабильных: `ENUM`, но осторожно — enum сложнее менять миграциями.

### JSON / JSONB
JSONB можно использовать для:
- metadata
- external raw payload
- редких optional-настроек
- audit snapshot
- calorie mappings / cooked stats

Нельзя использовать JSONB для:
- ключевых бизнес-полей (деньги, статусы)
- частых фильтров / сортировок
- permission logic
- связей между сущностями

> Если по полю часто фильтруешь, сортируешь или строишь права — это не JSON, это колонка.

---

## 9. Constraints — база должна защищать данные

Backend validation нужен, но DB constraints обязательны.

Обязательно:
```text
PRIMARY KEY
FOREIGN KEY
NOT NULL
UNIQUE
CHECK
DEFAULT
```

Пример:
```sql
CREATE TABLE organization_members (
  id              UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  role            TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_org_member_user UNIQUE (organization_id, user_id)
);
```

> Backend может ошибиться. DB не должна позволить сломать факты.

---

## 10. Relationship rules

### 1-to-many
В дочерней таблице FK + индекс.

```sql
project_id UUID NOT NULL REFERENCES projects(id)
```

### Many-to-many
Не делать массив ids в JSON. Делать junction table.

```sql
CREATE TABLE task_assignees (
  task_id UUID NOT NULL REFERENCES tasks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (task_id, user_id)
);
```

### 1-to-1
Использовать отдельную таблицу, если данные редкие / тяжёлые / доступы разные.

---

## 11. Индексы

Индексы — это не украшение. Индекс должен иметь причину и владельца.

### Правило индекса
У каждого индекса должен быть owner: какой endpoint / query его использует.

### Порядок колонок в composite index
```text
1. tenant / organization_id / admin_id
2. equality filters
3. range filters
4. sort columns
5. id for stable cursor
```

Пример:
```sql
CREATE INDEX idx_orders_admin_delivery_status
ON orders (admin_id, delivery_date, order_status)
WHERE deleted_at IS NULL;
```

### Не индексировать всё подряд
Каждый индекс стоит ресурсов: больше размер DB, медленнее INSERT/UPDATE, больше RAM.

### Foreign keys часто требуют индекс
Если часто `WHERE project_id = ?`, нужен индекс. Если уже composite начинается с project_id, отдельный может быть лишним.

---

## 12. Pagination

По умолчанию — **cursor / seek pagination**.

Плохо на больших таблицах:
```sql
LIMIT 25 OFFSET 100000;
```

Хорошо:
```sql
SELECT id, title, updated_at
FROM orders
WHERE admin_id = $1
  AND deleted_at IS NULL
  AND (updated_at, id) < ($2, $3)
ORDER BY updated_at DESC, id DESC
LIMIT 25;
```

Правила:
- сортировка должна быть стабильной
- id добавляется как tie-breaker
- limit всегда ограничен (default 25, max 100)

---

## 13. Query contracts

Каждый важный запрос должен быть описан как контракт.

```yaml
accessPattern: orders.listByAdmin
owner: modules/orders
endpoint: GET /api/v1/admin/orders

priority: D1

params:
  adminId: uuid
  status: optional string
  cursor: optional string
  limit:
    default: 25
    max: 100

select:
  - id
  - orderNumber
  - orderStatus
  - customerName
  - deliveryDate
  - updated_at

filters:
  - admin_id = :adminId
  - status = :status
  - deleted_at IS NULL

sort:
  - updated_at DESC
  - id DESC

index:
  name: idx_orders_admin_delivery_status
  columns: [admin_id, delivery_date, order_status, updated_at DESC, id DESC]

budget:
  p95Ms: 80
  maxRowsReturned: 100
  maxRowsScanned: 500
  maxPayloadKb: 50
```

> Нет query contract — значит запрос будет расти хаотично.

---

## 14. SELECT rules

Нельзя: `SELECT * FROM orders;`

Нужно:
```sql
SELECT id, order_number, status, customer_id, updated_at
FROM orders
WHERE admin_id = $1
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 25;
```

Правила:
1. Выбирай только нужные колонки.
2. List query не должен доставать detail-поля.
3. Большие TEXT/JSON поля не тащить в списки.
4. Файлы / BLOB не хранить прямо в основных таблицах.
5. Для тяжёлых данных — отдельная таблица или object storage.

---

## 15. DTO ↔ DB

Не отдавай DB row напрямую наружу.

DB row содержит: `internal_flags`, `deleted_at`, `version`, `password_hash`.  
API DTO содержит: публичные поля, связанные summary-объекты.

> DB schema — это внутренний контракт хранения.  
> API DTO — это внешний контракт продукта.  
> Они не обязаны совпадать 1:1.

---

## 16. Normalization / denormalization

### Write model
Для записи — нормализованная модель (3NF). Меньше дублей, проще consistency, лучше constraints.

### Read model
Для частых тяжёлых чтений — денормализованная read model.

Пример:
```sql
CREATE TABLE daily_order_stats (
  admin_id       UUID PRIMARY KEY,
  total_orders   INTEGER NOT NULL DEFAULT 0,
  open_orders    INTEGER NOT NULL DEFAULT 0,
  done_orders    INTEGER NOT NULL DEFAULT 0,
  revenue_sum    NUMERIC(12,2) DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Денормализация разрешена, если есть owner, способ обновления и документация.

---

## 17. Counters and stats

Плохо: делать `COUNT(*)` по огромным таблицам на каждый dashboard.

Лучше: `daily_order_stats`, `admin_dashboard_counters`, materialized views, background aggregation.

---

## 18. Transactions

Правила:
1. Транзакции должны быть короткими.
2. Не делать HTTP-запросы внутри DB transaction.
3. Не выполнять долгие вычисления внутри transaction.
4. Блокировки брать как можно позже.
5. Коммитить как можно раньше.
6. Для побочных эффектов использовать outbox.

### Optimistic locking
```sql
UPDATE orders
SET status = $1,
    version = version + 1,
    updated_at = now()
WHERE id = $2
  AND version = $3;
```
Если обновлено 0 строк: `ORDER_VERSION_CONFLICT`.

---

## 19. Outbox pattern

Чтобы не терять события:

```text
DB transaction
├── insert/update main data
├── insert outbox_event
└── commit

worker
├── read unpublished outbox events
├── publish to queue / webhook
└── mark as published
```

Таблица `outbox_events` уже есть в схеме (Prisma model).

---

## 20. Audit log

Для опасных действий нужен audit.

Таблица `order_audit_events` и `action_logs` уже есть.

Правила:
- audit append-only
- audit не редактируется
- audit можно партиционировать по времени
- audit не должен тормозить основную транзакцию слишком сильно

---

## 21. Multi-tenant правила

В текущей схеме тенантность обеспечивается через `createdBy` (Admin).

Правила:
1. Не доверять frontend.
2. `createdBy` / `adminId` фильтр обязателен в запросах.
3. Permissions проверяются на backend.
4. Индексы часто начинаются с `admin_id` / `created_by`.
5. Нельзя случайно сделать cross-tenant query.
6. Для новых таблиц рассмотреть явное `organization_id`.

---

## 22. Soft delete

Soft delete использовать только если есть причина: restore, audit/legal, user mistake recovery.

Поле: `deleted_at TIMESTAMPTZ` (nullable).  
Запросы: `WHERE deleted_at IS NULL`.  
Индексы: partial index `WHERE deleted_at IS NULL` для hot data.

> Если везде есть soft delete, но нет restore/lifecycle — это просто мусор в таблицах.

---

## 23. Data lifecycle

| Тип | Где держать |
|---|---|
| Hot (0–90 дней) | основная DB |
| Warm (90д–2г) | основная DB / read replica |
| Cold (2г+) | archive tables / object storage |
| Analytics | OLAP / ClickHouse / BigQuery |

### Retention policy
```yaml
table: order_audit_events
retention:
  hot: 90 days
  archive: 2 years
  deleteAfter: 3 years
```

---

## 24. Partitioning

Использовать, когда:
- таблица очень большая (> 10M rows)
- данные естественно режутся по времени / tenant
- часто удаляются старые периоды
- запросы почти всегда содержат partition key

Хорошие кандидаты: `order_audit_events`, `action_logs`, `outbox_events`, `messages`.

---

## 25. Migrations

### Безопасные миграции — Expand / Contract pattern
```text
1. Add new nullable column
2. Deploy app writes both old and new
3. Backfill data in batches
4. Deploy app reads new column
5. Add NOT NULL / constraints
6. Remove old column later
```

### Опасно
- добавить NOT NULL column без default/backfill
- переименовать колонку без совместимости
- удалить колонку сразу
- создать индекс blocking способом на большой таблице
- огромный UPDATE без батчей

Для больших таблиц: `CONCURRENTLY`, `lock_timeout`, `statement_timeout`, `dry-run`.

---

## 26. Resource budgets

| Метрика | Default |
|---|---|
| Simple PK lookup | 1–10ms |
| Indexed list query | 30–80ms |
| Сложный read query | 100–200ms |
| Slow query threshold | 100–200ms |
| Max rows returned | 100 |
| Default limit | 25–50 |
| Max rows scanned/returned | < 10:1 |
| Transaction duration | < 100–300ms |
| Migration lock timeout | 1–5s |
| HTTP request DB queries | 5–10 max |

> Если endpoint быстрый, но DB читает 500k строк ради 25 результатов — это будущая авария.

---

## 27. Query observability

Нужно видеть:
```text
slow queries
top queries by total time / calls
rows scanned / returned
index usage
locks / deadlocks
connection pool usage
replication lag
table bloat
cache hit ratio
```

Backend log:
```json
{
  "requestId": "req_123",
  "queryName": "orders.listByAdmin",
  "durationMs": 42,
  "rows": 25,
  "cache": "MISS",
  "db": "primary",
  "indexExpected": "idx_orders_admin_delivery_status"
}
```

---

## 28. Read replicas

Read replica полезна для: тяжёлых read-only запросов, reports, admin lists, exports.

Правила:
- реплика может отставать
- read-after-write — читай с primary или учитывай consistency
- критичные проверки / permissions — лучше с primary

---

## 29. Files / blobs

Плохо: хранить большие файлы в основной OLTP DB.  
Хорошо: object storage (S3/R2/GCS), DB хранит metadata.

---

## 30. Search

Не превращай основную DB в поисковый движок для всего.

Можно в PostgreSQL: простые фильтры, `ILIKE`, полнотекстовая индексация (GIN).  
Для сложного: OpenSearch / Meilisearch / Elasticsearch.

> OLTP DB — источник истины. Search index — производная read model.

---

## 31. Analytics

Не нагружай основную DB тяжёлыми аналитическими запросами.

Если нужны воронки, отчёты, агрегации по миллионам событий — выноси в OLAP:
```text
ClickHouse / BigQuery / Snowflake / Redshift / DuckDB
```

---

## 32. Access-pattern-first пример

Backend request: `GET /api/v1/views/order-detail/{orderId}?sections=main,audit,stats`

Request Tree:
```text
order-detail
├── main (D0)
│   ├── order summary
│   ├── customer summary
│   └── admin/courier summary
├── audit (D2)
│   └── order audit events (limit 20)
└── transactions (D3 lazy)
    └── transactions list
```

DB Query Tree:
```text
q1 orders.getById
q2 customers.getSummaryById
q3 admins.batchSummaryByIds (courier + admin)
q4 order_audit_events.listByOrder
q5 transactions.listByOrder (lazy)
```

Index Tree:
```text
orders: pk_orders_id, idx_orders_admin_delivery_status
customers: pk_customers_id, idx_customers_created_by_active_created
admins: pk_admins_id, idx_admins_role_is_active
order_audit_events: idx_order_audit_events_order_occurred
transactions: idx_transactions_admin_created
```

---

## 33. DB структура проекта как библиотека

```text
db/
├── README.md
├── migrations/
├── schema/
│   ├── current.sql
│   └── diagrams/
├── access-patterns/
│   ├── orders.listByAdmin.yaml
│   ├── customers.listByAdmin.yaml
│   └── dashboard.getCounters.yaml
├── indexes/
│   ├── orders.indexes.md
│   └── customers.indexes.md
├── seeds/
│   ├── dev.seed.sql
│   └── test.seed.sql
├── fixtures/
├── views/
│   └── dashboard_counters.sql
├── docs/
│   ├── data-model.md
│   ├── lifecycle.md
│   ├── retention.md
│   └── query-budgets.md
└── scripts/
    ├── explain-query.sh
    └── backup.sh
```

---

## 34. Security baseline для DB

Обязательно:
```text
least privilege
отдельные DB users/roles
нет root/admin user в приложении
шифрование sensitive данных
backup encryption
audit опасных действий
no secrets in logs
PII classification
```

Роли:
```text
app_rw       — приложение read/write только нужные схемы
app_readonly — read-only для reports/admin
migration   — миграции
analytics   — только read к нужным таблицам/views
```

Sensitive data:
```text
password hash
tokens
email / phone
address / payment data
PII не писать в обычные logs
```

---

## 35. Backups / Restore

Backup без restore-теста — это надежда, а не система.

```yaml
backup:
  rpo: 15 minutes
  rto: 2 hours
  retention:
    daily: 14 days
    weekly: 8 weeks
    monthly: 12 months
  restoreTest: monthly
```

---

## 36. Testing DB

Минимум:
```text
migration tests
constraint tests
repository integration tests
query plan regression tests
seed/fixture validation
backup restore test
```

---

## 37. Definition of Done для таблицы

```text
[ ] есть понятный domain owner
[ ] есть primary key
[ ] есть нужные foreign keys
[ ] есть NOT NULL где нужно
[ ] есть UNIQUE/CHECK constraints
[ ] есть created_at/updated_at
[ ] есть version (optimistic locking)
[ ] есть deleted_at (soft delete)
[ ] определён lifecycle данных
[ ] определена retention policy
[ ] описаны access patterns
[ ] добавлены индексы под access patterns
[ ] нет ненужного JSON для ключевых полей
[ ] нет хранения больших файлов в row
[ ] есть migration с forward/rollback strategy
[ ] есть тесты на constraints / N+1
[ ] обновлена документация
```

---

## 38. Definition of Done для query

```text
[ ] имеет имя и owner
[ ] описан access pattern
[ ] выбирает только нужные колонки (не SELECT *)
[ ] имеет limit для list
[ ] использует cursor для больших списков
[ ] имеет ожидаемый индекс
[ ] проверен EXPLAIN / ANALYZE
[ ] имеет budget по времени
[ ] не делает N+1
[ ] не делает лишний COUNT(*)
[ ] не читает чужой tenant
[ ] логируется duration / rows
```

---

## 39. Definition of Done для migration

```text
[ ] имеет понятное имя
[ ] маленькая и атомарная
[ ] безопасна для production
[ ] не держит долгие locks
[ ] большие backfill идут батчами
[ ] есть план rollback или forward-fix
[ ] протестирована на копии данных
[ ] совместима с текущей и новой версией app
[ ] обновлены schema/docs
```

---

## 40. 50 senior-законов DB

### Модель данных
1. База хранит факты, а не случайные JSON-куски.
2. Таблица должна иметь владельца.
3. Связи должны быть явными.
4. Foreign key — это не бюрократия, а защита данных.
5. Не храни массив foreign keys в JSON.
6. Деньги не хранятся в float.
7. Время храни в `timestamptz`.
8. Один статус — один смысл.
9. Soft delete должен иметь причину.
10. Audit log append-only.

### Запросы
11. `SELECT *` — почти всегда ошибка.
12. Каждый list query имеет limit.
13. Offset pagination на больших данных — будущая проблема.
14. Cursor pagination требует стабильной сортировки.
15. COUNT на большой таблице должен быть осознанным.
16. List DTO не должен тащить detail-поля.
17. Большие TEXT/JSON не должны попадать в списки.
18. Query должен иметь имя.
19. Query без budget — неизвестная стоимость.
20. N+1 — архитектурный запах.

### Индексы
21. Индекс создаётся под access pattern.
22. Индекс без владельца станет мусором.
23. Слишком много индексов замедляет записи.
24. Composite index начинается с самых селективных/equality-фильтров и tenant.
25. Sort должен учитываться в индексе.
26. Partial index полезен для active/deleted/status данных.
27. Foreign key часто требует индекс.
28. Индекс не лечит плохой запрос полностью.
29. Индексы нужно мониторить.
30. Неиспользуемые индексы нужно удалять осторожно.

### Транзакции
31. Транзакции должны быть короткими.
32. Не делай внешние HTTP calls внутри transaction.
33. Lock нужно брать поздно и держать мало.
34. Optimistic locking лучше долгих блокировок для UI.
35. Побочные эффекты после commit — через outbox.
36. Idempotency key нужен для повторяемых write requests.
37. Deadlocks нужно логировать и разбирать.
38. Retry write operation должен быть безопасным.
39. Не смешивай долгую аналитику и OLTP transaction.
40. Consistency важнее красивого shortcut.

### Миграции и эксплуатация
41. Миграции — часть кода.
42. Большая миграция без dry-run — риск.
43. Backfill делается батчами.
44. Удаление колонок — последний шаг, не первый.
45. Backup без restore-теста — не backup.
46. Production DB не место для ручных экспериментов.
47. Read replica не гарантирует свежесть данных.
48. Analytics лучше выносить из OLTP.
49. Observability DB обязательна.
50. Schema docs экономят месяцы жизни команды.

---

## 41. Главное правило DB-системы

Если сомневаешься, выбирай так:

```text
1. Целостность данных
2. Безопасность данных
3. Понятность модели
4. Быстрые hot queries
5. Минимум лишних строк/колонок
6. Безопасные migrations
7. Observability
8. Масштабируемость
```

---

## 42. Короткая финальная формула

> **Access-pattern-first DB design with domain data tree, strict constraints, query budgets, read models and migration discipline.**

По-русски:
> **База данных от дерева доступа: доменная модель + запросы + индексы + жизненный цикл данных.**

Самая короткая мысль:

```text
DB должна быть картой быстрых и безопасных путей к данным,
а не складом таблиц, которые когда-то кому-то понадобились.
```
