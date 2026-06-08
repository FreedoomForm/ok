# API Tree — Food Delivery SaaS

## Текущее состояние API

```
/api
├── /auth
│   ├── [...nextauth]     # NextAuth routes
│   ├── /signup           # POST — регистрация
│   └── /login            # POST — логин
│
├── /admin                # MIDDLE_ADMIN API
│   ├── /me               # GET/POST — текущий админ
│   ├── /[adminId]        # GET/PUT — профиль админа
│   │   ├── /toggle-status    # PATCH
│   │   ├── /password         # PATCH
│   │   └── /[adminId2]/...   # SUPER_ADMIN → MIDDLE_ADMIN
│   │       ├── /delete
│   │       └── /toggle-status
│   ├── /users-list       # GET
│   ├── /middle-admins    # GET/POST
│   ├── /low-admins       # GET/POST
│   │   └── /[id]         # GET/PUT/DELETE
│   ├── /clients          # GET/POST
│   │   ├── /[id]         # GET/PUT/DELETE
│   │   ├── /toggle-status    # PATCH
│   │   ├── /bulk-update      # PATCH
│   │   ├── /run-auto-orders  # POST
│   │   ├── /restore          # PATCH
│   │   ├── /delete           # DELETE
│   │   ├── /permanent-delete # DELETE
│   │   └── /bin              # GET
│   ├── /orders
│   │   ├── /bulk-update      # PATCH
│   │   ├── /delete           # DELETE
│   │   ├── /permanent-delete # DELETE
│   │   ├── /restore          # PATCH
│   │   ├── /reorder          # POST
│   │   └── /[orderId]/timeline  # GET
│   ├── /couriers         # GET/POST
│   ├── /menus            # GET/POST
│   ├── /sets             # GET/POST
│   │   └── /[id]         # GET/PUT/DELETE
│   ├── /warehouse
│   │   ├── /ingredients  # GET/POST
│   │   ├── /dishes       # GET/POST
│   │   ├── /cook         # POST
│   │   ├── /cooking-plan # GET/POST
│   │   └── /inventory    # GET/POST
│   ├── /finance
│   │   ├── /company      # GET/POST
│   │   ├── /salary       # GET/POST
│   │   ├── /clients      # GET/POST
│   │   ├── /transaction  # GET/POST
│   │   ├── /buy-ingredients  # POST
│   │   └── /admin-balances   # GET
│   ├── /profile          # GET/POST
│   │   └── /change-password  # POST
│   ├── /statistics       # GET/POST
│   ├── /scheduler        # GET/POST
│   ├── /features         # GET/POST
│   ├── /website          # GET/POST
│   │   └── /ai-edit      # POST
│   ├── /action-logs      # GET/POST
│   ├── /live-map         # GET/POST
│   ├── /route-optimize   # POST
│   ├── /expand-url       # GET
│   ├── /database-snapshot       # GET/POST
│   ├── /database-import-xlsx    # POST
│   ├── /database-import-xlsx-all# POST
│   ├── /database-row            # GET/POST
│   ├── /dispatch
│   │   ├── /start-day    # POST
│   │   ├── /ors-optimize # POST
│   │   ├── /ors-polyline # POST
│   │   └── /normalize-drafts # POST
│   └── /auto-orders
│       ├── /create       # POST
│       ├── /schedule     # GET/POST
│       └── /client       # POST
│
├── /courier
│   ├── /stats            # GET/POST
│   ├── /location         # POST
│   ├── /next-order       # GET
│   ├── /route            # GET/POST
│   ├── /withdraw         # POST
│   ├── /profile          # GET/PUT
│   ├── /orders           # GET
│   └── /orders/[id]
│       ├── /complete     # POST
│       └── /fail         # POST
│
├── /customers
│   ├── /                 # GET/POST
│   ├── /auth
│   │   ├── /login        # POST
│   │   └── /logout       # POST
│   ├── /plan             # GET
│   ├── /profile          # GET/PUT
│   ├── /orders           # GET/POST
│   │   └── /[id]         # GET/PUT
│   └── /today-menu       # GET
│
├── /sites/[subdomain]
│   ├── /                 # GET/POST
│   └── /auth
│       ├── /send-code    # POST
│       ├── /verify-code  # POST
│       ├── /login        # POST
│       └── /register     # POST
│
├── /chat
│   ├── /conversations    # GET/POST
│   ├── /messages         # GET/POST
│   ├── /send             # POST
│   └── /users            # GET
│
├── /ai
│   └── /chat             # POST
│
├── /orders
│   ├── /                 # GET/POST
│   └── /[orderId]        # GET/PUT
│
├── /system
│   └── /auto-scheduler   # POST
│
├── /cron
│   ├── /check-trials     # GET
│   └── /scheduler        # GET
│
└── /health               # GET
```

---

## Целевое состояние API (v2 — по дизайн-системе)

Все API под `/api/v1/`, с существительными, версии, макс 2 уровня вложенности.

```
/api/v1
├── /auth
│   ├── POST   /auth/sessions              # Логин
│   ├── DELETE /auth/sessions/current       # Логин
│   ├── POST   /auth/signup                 # Регистрация
│   ├── POST   /auth/password/reset-request
│   └── POST   /auth/password/reset-confirm
│
├── /me
│   ├── GET    /me                          # Профиль текущего пользователя
│   ├── PATCH  /me                          # Обновить профиль
│   ├── POST   /me/change-password
│   └── GET    /me/permissions
│
├── /admins
│   ├── GET    /admins                      # Список (SUPER sees MIDDLE, MIDDLE sees LOW)
│   ├── POST   /admins                      # Создать
│   ├── GET    /admins/{adminId}
│   ├── PATCH  /admins/{adminId}
│   ├── PATCH  /admins/{adminId}/status     # toggle active
│   ├── PATCH  /admins/{adminId}/password
│   └── DELETE /admins/{adminId}
│
├── /clients
│   ├── GET    /clients                     # Список с фильтрами
│   ├── POST   /clients
│   ├── GET    /clients/{clientId}
│   ├── PATCH  /clients/{clientId}
│   ├── DELETE /clients/{clientId}           # soft delete
│   ├── GET    /clients/bin                  # корзина
│   ├── PATCH  /clients:restore              # восстановить
│   ├── DELETE /clients:permanent-delete     # навсегда
│   ├── PATCH  /clients:bulk-update
│   └── POST   /clients:run-auto-orders
│
├── /orders
│   ├── GET    /orders                      # Список с фильтрами/пагинацией
│   ├── POST   /orders
│   ├── GET    /orders/{orderId}
│   ├── PATCH  /orders/{orderId}
│   ├── DELETE /orders/{orderId}             # soft delete
│   ├── GET    /orders/{orderId}/timeline    # аудит статусов
│   ├── PATCH  /orders:bulk-update
│   ├── PATCH  /orders:restore
│   ├── DELETE /orders:permanent-delete
│   └── POST   /orders:reorder
│
├── /couriers
│   ├── GET    /couriers
│   ├── POST   /couriers
│   ├── GET    /couriers/{courierId}
│   ├── PATCH  /couriers/{courierId}
│   ├── GET    /couriers/{courierId}/orders
│   ├── GET    /couriers/{courierId}/stats
│   ├── POST   /couriers/{courierId}/location
│   ├── POST   /couriers/{courierId}/route
│   └── POST   /couriers/{courierId}:withdraw
│
├── /warehouse
│   ├── /ingredients
│   │   ├── GET    /warehouse/ingredients
│   │   └── POST   /warehouse/ingredients
│   ├── /dishes
│   │   ├── GET    /warehouse/dishes
│   │   └── POST   /warehouse/dishes
│   ├── /sets
│   │   ├── GET    /warehouse/sets
│   │   ├── POST   /warehouse/sets
│   │   ├── GET    /warehouse/sets/{setId}
│   │   ├── PATCH  /warehouse/sets/{setId}
│   │   └── DELETE /warehouse/sets/{setId}
│   ├── /menus
│   │   ├── GET    /warehouse/menus
│   │   └── POST   /warehouse/menus
│   ├── /cooking-plans
│   │   ├── GET    /warehouse/cooking-plans
│   │   └── POST   /warehouse/cooking-plans
│   ├── /inventory
│   │   ├── GET    /warehouse/inventory
│   │   └── POST   /warehouse/inventory
│   └── POST   /warehouse:cook               # действие — готовка
│
├── /finance
│   ├── /transactions
│   │   ├── GET    /finance/transactions
│   │   └── POST   /finance/transactions
│   ├── /company
│   │   ├── GET    /finance/company
│   │   └── POST   /finance/company
│   ├── /salaries
│   │   ├── GET    /finance/salaries
│   │   └── POST   /finance/salaries
│   ├── /client-balances
│   │   ├── GET    /finance/client-balances
│   │   └── POST   /finance/client-balances
│   ├── /admin-balances
│   │   └── GET    /finance/admin-balances
│   └── POST   /finance:buy-ingredients
│
├── /websites
│   ├── GET    /websites/{subdomain}
│   ├── PATCH  /websites/{subdomain}
│   └── POST   /websites/{subdomain}:ai-edit
│
├── /dispatch
│   ├── POST   /dispatch:start-day
│   ├── POST   /dispatch:ors-optimize
│   ├── POST   /dispatch:ors-polyline
│   └── POST   /dispatch:normalize-drafts
│
├── /auto-orders
│   ├── POST   /auto-orders:create
│   ├── GET    /auto-orders/schedule
│   ├── POST   /auto-orders/schedule
│   └── POST   /auto-orders:client
│
├── /features
│   ├── GET    /features
│   └── POST   /features
│
├── /action-logs
│   ├── GET    /action-logs
│   └── POST   /action-logs
│
├── /statistics
│   ├── GET    /statistics
│   └── POST   /statistics
│
├── /scheduler
│   ├── GET    /scheduler
│   └── POST   /scheduler
│
├── /database
│   ├── GET    /database/snapshot
│   ├── POST   /database/snapshot
│   ├── POST   /database:import-xlsx
│   ├── POST   /database:import-xlsx-all
│   ├── GET    /database/rows
│   └── POST   /database/rows
│
├── /chat
│   ├── GET    /chat/conversations
│   ├── POST   /chat/conversations
│   ├── GET    /chat/conversations/{id}/messages
│   ├── POST   /chat/messages
│   ├── POST   /chat:send
│   └── GET    /chat/users
│
├── /customer-auth
│   ├── POST   /customer-auth/login
│   ├── POST   /customer-auth/logout
│   ├── POST   /customer-auth/send-code
│   ├── POST   /customer-auth/verify-code
│   └── POST   /customer-auth/register
│
├── /customers
│   ├── GET    /customers
│   ├── POST   /customers
│   ├── GET    /customers/{customerId}
│   ├── PATCH  /customers/{customerId}
│   ├── GET    /customers/{customerId}/plan
│   ├── GET    /customers/{customerId}/orders
│   ├── POST   /customers/{customerId}/orders
│   └── GET    /customers/today-menu
│
├── /jobs
│   ├── GET    /jobs/{jobId}
│   └── DELETE /jobs/{jobId}
│
└── /views                              # BFF / View API
    ├── GET    /views/dashboard
    ├── GET    /views/warehouse
    ├── GET    /views/orders-list
    ├── GET    /views/clients-list
    ├── GET    /views/finance-summary
    ├── GET    /views/courier-dashboard/{courierId}
    └── GET    /views/customer-portal/{subdomain}
```

---

## Проблемы текущего API и план миграции

| Проблема | Текущее | Целевое |
|---|---|---|
| Нет версионирования | `/api/admin/...` | `/api/v1/...` |
| Глубокая вложенность | `/api/admin/[adminId]/[adminId2]/delete` | `DELETE /api/v1/admins/{adminId}` |
| Смешивание ролей | `/api/admin/clients` и `/api/customers` | Разделение `/api/v1/clients` vs `/api/v1/customers` |
| Actions не выделены | `/api/admin/clients/toggle-status` | `PATCH /api/v1/clients/{id}/status` |
| Нет пагинации курсором | Везде offset | cursor-based для больших списков |
| Нет DTO уровней | Возвращается вся модель | Summary/ListItem/Detail |
| Нет `fields`/`include` | Все поля всегда | `?fields=id,name&include=stats` |
| Нет стандарта ошибок | Разные форматы | `{ error: { code, message, requestId } }` |
