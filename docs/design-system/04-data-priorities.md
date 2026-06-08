# B0/B1/B2/B3 и D0/D1/D2/D3 — Приоритеты данных

## Формула

```
B0/B1/B2/B3 — backend data priorities (что и как загружать)
D0/D1/D2/D3 — database data priorities (как хранить и индексировать)
```

---

## B-приоритеты по экранам

### Dashboard (MIDDLE_ADMIN)
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | admin profile | 15s | immediate |
| B0 | permissions/allowedTabs | 15s | immediate |
| B0 | trial status | 60s | immediate |
| B1 | today stats (orders, revenue, clients) | 30s | parallel |
| B1 | today menu preview | 120s | parallel |
| B1 | recent orders (limit=10) | 15s | parallel |
| B2 | finance summary | 60s | lazy |
| B2 | courier overview | 30s | lazy |
| B3 | action logs | 0 (no cache) | on demand |

### Orders Tab
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | orders list (paginated) | 5s | immediate |
| B0 | order filters | — | with list |
| B1 | order status counts | 30s | parallel |
| B1 | couriers list (for filter/assign) | 120s | parallel |
| B2 | order detail + timeline | 5s | on modal open |
| B3 | order export | — | async job |

### Clients Tab
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | clients list (paginated) | 5s | immediate |
| B1 | client counts by status | 30s | parallel |
| B1 | menu sets list (for assign) | 120s | parallel |
| B2 | client detail + orders + balance | 5s | on modal open |
| B3 | client export / bin | — | async job |

### Warehouse Tab
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | ingredients list | 30s | on tab active |
| B1 | dishes list | 30s | on sub-tab active |
| B1 | menu sets list | 60s | on sub-tab active |
| B2 | cooking plan | 60s | on sub-tab active |
| B2 | inventory | 30s | on sub-tab active |
| B3 | warehouse export | — | async job |

### Finance Tab
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | company balance | 15s | immediate |
| B0 | transactions list (paginated) | 5s | immediate |
| B1 | admin balances | 60s | parallel |
| B1 | client balances | 60s | parallel |
| B1 | salary summary | 60s | parallel |
| B2 | buy ingredients log | 30s | lazy |
| B3 | finance export | — | async job |

### Dispatch Tab
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | today orders with addresses | 5s | immediate |
| B1 | couriers on shift + locations | 10s | parallel |
| B1 | route optimization | 0 | on action |
| B2 | ORS polylines | 300s | lazy |
| B3 | dispatch history | 0 | on demand |

### Courier Dashboard
| Приоритет | Данные | Cache TTL | Загрузка |
|---|---|---|---|
| B0 | courier profile | 60s | immediate |
| B0 | current/next order | 5s | immediate |
| B1 | today stats | 30s | parallel |
| B1 | today orders list | 10s | parallel |
| B2 | order history | 60s | lazy |
| B3 | withdraw request | 0 | on action |

---

## D-приоритеты (Database)

### D0 — Критические данные (быстрые, strict constraints)

| Таблица | Запрос | Индекс |
|---|---|---|
| admins | getByEmail, getById | PK, email unique |
| admins | getByRole | idx_admins_role |
| customers | getById, getByPhone | PK, phone |
| orders | getById | PK |
| orders | getByOrderNumber | orderNumber unique |
| menu_sets | getById | PK |
| warehouse_items | getById, getByName | PK, name unique |

### D1 — Частые данные (оптимизируются индексами)

| Таблица | Запрос | Индекс |
|---|---|---|
| orders | listByAdminFiltered | idx_orders_admin_date_status |
| orders | listByCourier | idx_orders_courier_date |
| customers | listByAdminFiltered | idx_customers_admin_active |
| transactions | listByAdminDate | idx_transactions_admin_date |
| menu_sets | listByAdmin | idx_menu_sets_admin |
| dishes | listAll | — |
| warehouse_items | listAll | — |
| daily_cooking_plans | getByDate | date unique |
| order_audit_events | listByOrder | idx_audit_order_created |

### D2 — Дополнительные данные (lazy, отдельный endpoint)

| Таблица | Запрос | Индекс |
|---|---|---|
| order_audit_events | listByAdminDate | idx_audit_admin_created |
| action_logs | listByAdmin | idx_action_logs_admin_date |
| features | getByAdmin | owner_admin_id |
| interface_configs | getByAdmin | admin_id unique |
| conversations | listByUser | idx_conversations_user |
| messages | listByConversation | idx_messages_conversation |

### D3 — Тяжёлые/редкие данные (async, export, partitioning)

| Таблица | Запрос | Примечание |
|---|---|---|
| orders | export | async job, CSV |
| customers | export | async job |
| transactions | export | async job |
| order_audit_events | archive | партиционирование по дате |
| action_logs | archive | партиционирование по дате |
