# DB Access Patterns & Query Contracts

## Текущие проблемы Prisma Schema

1. **Нет version поля** — нет optimistic locking
2. **Нет organization_id/tenant_id** — фильтрация по adminId вместо tenant
3. **JSON вместо связанных таблиц** — Dish.ingredients, MenuSet.calorieGroups, DailyCookingPlan.dishes
4. **Нет deleted_at** на Order — только на Customer
5. **Нет индексов** под частые запросы
6. **Нет created_at/updated_at** на некоторых таблицах
7. **Decimal для денег не используется** — amount INT в Transaction

---

## Access Patterns

### orders.listByAdminFiltered
```yaml
accessPattern: orders.listByAdminFiltered
owner: modules/orders
endpoint: GET /api/v1/orders

priority: D1

params:
  adminId: uuid (required)
  status: optional string (enum OrderStatus)
  deliveryDate: optional date
  courierId: optional uuid
  search: optional string
  cursor: optional string
  limit:
    default: 25
    max: 100

select:
  - id
  - order_number
  - order_status
  - payment_status
  - delivery_date
  - delivery_time
  - quantity
  - calories
  - customer_id
  - courier_id
  - created_at

filters:
  - admin_id = :adminId
  - order_status = :status
  - delivery_date = :deliveryDate
  - courier_id = :courierId
  - deleted_at IS NULL

sort:
  - delivery_date DESC
  - created_at DESC
  - id DESC

index:
  name: idx_orders_admin_date_status
  columns:
    - admin_id
    - delivery_date DESC
    - order_status
    - created_at DESC
    - id DESC

budget:
  p95Ms: 80
  maxRowsReturned: 100
  maxRowsScanned: 500
```

### orders.getByOrderNumber
```yaml
accessPattern: orders.getByOrderNumber
priority: D0
index: uniq_orders_order_number (existing)
budget:
  p95Ms: 10
```

### customers.listByAdminFiltered
```yaml
accessPattern: customers.listByAdminFiltered
owner: modules/customers
endpoint: GET /api/v1/clients

priority: D1

params:
  adminId: uuid (required)
  isActive: optional boolean
  planType: optional string (enum PlanType)
  search: optional string
  cursor: optional string
  limit:
    default: 25
    max: 100

select:
  - id
  - name
  - phone
  - plan_type
  - is_active
  - balance
  - assigned_set_id
  - daily_price
  - created_at

filters:
  - admin_id = :adminId
  - is_active = :isActive
  - plan_type = :planType
  - deleted_at IS NULL

sort:
  - created_at DESC
  - id DESC

index:
  name: idx_customers_admin_active
  columns:
    - admin_id
    - is_active
    - created_at DESC
    - id DESC

budget:
  p95Ms: 80
```

### transactions.listByAdminDate
```yaml
accessPattern: transactions.listByAdminDate
owner: modules/finance
endpoint: GET /api/v1/finance/transactions

priority: D1

params:
  adminId: uuid (required)
  type: optional string (enum TransactionType)
  dateFrom: optional date
  dateTo: optional date
  cursor: optional string
  limit:
    default: 25
    max: 100

select:
  - id
  - amount
  - type
  - description
  - category
  - created_at

filters:
  - admin_id = :adminId
  - type = :type
  - created_at >= :dateFrom
  - created_at <= :dateTo

sort:
  - created_at DESC
  - id DESC

index:
  name: idx_transactions_admin_date
  columns:
    - admin_id
    - created_at DESC
    - id DESC

budget:
  p95Ms: 80
```

### menu_sets.listByAdmin
```yaml
accessPattern: menu_sets.listByAdmin
owner: modules/warehouse
endpoint: GET /api/v1/warehouse/sets

priority: D1

params:
  adminId: uuid (required)
  isActive: optional boolean

select:
  - id
  - name
  - menu_number
  - is_active

filters:
  - admin_id = :adminId
  - is_active = :isActive

sort:
  - name ASC

index:
  name: idx_menu_sets_admin
  columns:
    - admin_id
    - name

budget:
  p95Ms: 50
```

### warehouse_items.listAll
```yaml
accessPattern: warehouse_items.listAll
priority: D1
select:
  - id
  - name
  - amount
  - unit
  - kcal_per_gram
  - price_per_unit
  - price_unit
sort:
  - name ASC
budget:
  p95Ms: 50
```

---

## Миграция Schema — Приоритетные изменения

### Критичные (P0)

1. Добавить `version Integer @default(1)` на Admin, Customer, Order, MenuSet, Dish, WarehouseItem
2. Добавить `updatedAt DateTime @updatedAt` где отсутствует
3. Добавить `deletedAt DateTime?` на Order
4. Заменить `amount Int` → `amountCents BigInt` в Transaction (с миграцией)
5. Добавить составные индексы под access patterns

### Важные (P1)

6. Добавить `adminId` как обязательный на Transaction (для фильтрации)
7. Создать таблицу `dish_ingredients` вместо JSON (Dish.ingredients)
8. Создать таблицу `menu_set_groups` вместо JSON (MenuSet.calorieGroups)
9. Создать таблицу `menu_set_group_dishes` (many-to-many)
10. Добавить `idx_orders_courier_date` для курьерских запросов

### Дополнительные (P2)

11. Создать `customer_stats` read model
12. Создать `admin_stats` read model
13. Создать `order_status_counts` read model
14. Добавить outbox_events таблицу
15. Добавить audit_events таблицу (универсальная)
