# Domain Tree — Food Delivery SaaS

## Корневая доменная модель

```
Organization (Admin Hierarchy)
├── Super Admin
│   └── Управление всеми MIDDLE_ADMIN
├── Middle Admin
│   ├── Клиенты (Customers)
│   │   ├── Заказы (Orders)
│   │   │   ├── Статусы заказов
│   │   │   ├── Аудит заказов (OrderAuditEvent)
│   │   │   └── Оплаты
│   │   ├── Подписки/планы
│   │   └── Автозаказы
│   ├── Склад (Warehouse)
│   │   ├── Ингредиенты (WarehouseItem)
│   │   ├── Блюда (Dish)
│   │   │   └── Ингредиенты блюда
│   │   ├── Сеты (MenuSet)
│   │   │   ├── Группы калорийности
│   │   │   └── Блюда в сете
│   │   ├── Меню (Menu)
│   │   │   └── Блюда в меню
│   │   └── План готовки (DailyCookingPlan)
│   ├── Курьеры (Low Admin / Courier)
│   │   ├── Профиль курьера
│   │   ├── Маршруты
│   │   └── Статистика доставок
│   ├── Финансы (Finance)
│   │   ├── Транзакции (Transaction)
│   │   ├── Зарплаты
│   │   ├── Балансы
│   │   └── Закупки ингредиентов
│   ├── Веб-сайт (Website)
│   │   ├── Контент
│   │   ├── Тема/стили
│   │   └── Настройки
│   └── Настройки
│       ├── Интерфейс (InterfaceConfig)
│       ├── Фичи (Feature)
│       └── Логи действий (ActionLog)
└── Low Admin
    └── Исполнение задач курьера
```

## Сущности по ролям

### SUPER_ADMIN
- Видит всех MIDDLE_ADMIN
- Управляет тарифами/фичами
- Глобальная статистика

### MIDDLE_ADMIN
- Основная роль — управление "кухней"
- Клиенты, заказы, склад, меню, финансы, курьеры, сайт
- 80% всей функциональности

### LOW_ADMIN / COURIER
- Просмотр назначенных заказов
- Обновление статуса доставки
- GPS-трекинг
- История доставок

### CUSTOMER
- Портал клиента (site subdomain)
- Меню дня
- Оформление заказа
- История заказов
- Профиль/подписка

---

## Связи между сущностями

```
Admin (MIDDLE) ──1:N──> Customer
Admin (MIDDLE) ──1:N──> Order
Admin (MIDDLE) ──1:N──> MenuSet
Admin (MIDDLE) ──1:1──> Website
Admin (MIDDLE) ──1:1──> InterfaceConfig

Customer ──1:N──> Order
Customer ──1:1──> MenuSet (assignedSet)
Customer ──1:N──> Transaction

Order ──1:N──> OrderAuditEvent
Order ──N:1──> Admin (courier)

Menu ──M:N──> Dish
MenuSet ──N:1──> Menu

WarehouseItem ──входит в──> Dish.ingredients (JSON)
Dish ──входит в──> MenuSet.calorieGroups (JSON)
```
