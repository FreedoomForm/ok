# Request Trees — Food Delivery SaaS

Для каждого экрана описано дерево backend-запросов по приоритетам B0/B1/B2/B3.

---

## 1. MIDDLE_ADMIN Dashboard

```
Middle Admin Dashboard
├── B0: admin profile (me)
├── B0: permissions / allowed tabs
├── B0: trial status
│
├── B1: today stats (orders count, revenue, active clients)
├── B1: today menu preview
├── B1: recent orders (limit=10)
│
├── B2: finance summary
├── B2: courier status overview
│
└── B3: action logs (recent)
```

---

## 2. MIDDLE_ADMIN — Orders Tab

```
Orders Tab
├── B0: orders list (filtered, paginated, cursor-based)
│   ├── fields: id, orderNumber, customer.name, status, deliveryDate, amount, paymentStatus
│   ├── filters: date, status, courier, search
│   └── sort: -deliveryDate, -createdAt
│
├── B1: order count stats by status
├── B1: couriers list (for assignment filter)
│
├── B2: order detail modal
│   ├── full order info
│   ├── customer summary
│   └── timeline/audit events
│
└── B3: order export
```

---

## 3. MIDDLE_ADMIN — Clients Tab

```
Clients Tab
├── B0: clients list (filtered, paginated)
│   ├── fields: id, name, phone, planType, isActive, balance, assignedSet
│   ├── filters: active/inactive, planType, search
│   └── sort: -createdAt, name
│
├── B1: client count stats
├── B1: menu-sets list (for assignment filter)
│
├── B2: client detail modal
│   ├── full client info
│   ├── recent orders
│   ├── balance/transactions
│   └── delivery preferences
│
└── B3: client export
└── B3: bin (soft-deleted clients)
```

---

## 4. MIDDLE_ADMIN — Warehouse Tab

```
Warehouse Tab
├── B0: ingredients list
│   ├── fields: id, name, amount, unit, pricePerUnit
│   └── sort: name
│
├── B1: dishes list
│   ├── fields: id, name, mealType, ingredientCount
│   └── sort: name
│
├── B1: menu sets list
│   ├── fields: id, name, menuNumber, isActive, groupCount
│   ├── filters: isActive
│   └── sort: name
│
├── B2: cooking plan (by date)
├── B2: inventory check
│
└── B3: warehouse export
```

---

## 5. MIDDLE_ADMIN — Finance Tab

```
Finance Tab
├── B0: company balance
├── B0: recent transactions (limit=25)
│   ├── fields: id, amount, type, description, createdAt
│   └── sort: -createdAt
│
├── B1: admin balances
├── B1: client balances summary
├── B1: salary summary
│
├── B2: buy ingredients log
├── B2: detailed reports
│
└── B3: finance export
```

---

## 6. MIDDLE_ADMIN — Dispatch Tab

```
Dispatch Tab
├── B0: today orders with delivery addresses
│   ├── fields: id, orderNumber, customer.address, lat/lng, status, courier
│   └── sort: deliveryTime, route sequence
│
├── B1: couriers on shift (location, current orders)
├── B1: route optimization result
│
├── B2: live map data
├── B2: ORS polylines
│
└── B3: dispatch history
```

---

## 7. COURIER Dashboard

```
Courier Dashboard
├── B0: courier profile
├── B0: current/next order
│   ├── delivery address, customer info, items
│   └── route info
│
├── B1: today stats (delivered count, earnings)
├── B1: today order list
│
├── B2: order history
├── B2: route details
│
└── B3: withdraw request
```

---

## 8. CUSTOMER Portal

```
Customer Portal (Site)
├── B0: site content (theme, menu, info)
├── B0: today menu items
│
├── B1: customer profile (if logged in)
├── B1: customer plan/subscription
├── B1: create order
│
├── B2: order history
├── B2: order detail
│
└── B3: account settings
```

---

## 9. SUPER_ADMIN Dashboard

```
Super Admin Dashboard
├── B0: super admin profile
├── B0: middle-admins list
│   ├── fields: id, name, email, isActive, trialEndsAt, clientCount
│   └── sort: -createdAt
│
├── B1: global statistics
├── B1: platform metrics
│
├── B2: feature flags management
├── B2: database management
│
└── B3: system logs
└── B3: cron management
```

---

## View API Endpoints (BFF)

Для экранов, требующих несколько запросов, создаются агрегирующие endpoints:

```
GET /api/v1/views/dashboard?sections=stats,menu,recent-orders
GET /api/v1/views/warehouse?sections=ingredients,dishes,sets,cooking-plan
GET /api/v1/views/orders-list?sections=orders,filters,stats
GET /api/v1/views/clients-list?sections=clients,stats,sets
GET /api/v1/views/finance-summary?sections=balance,transactions,salaries
GET /api/v1/views/courier-dashboard/{courierId}?sections=profile,orders,stats
GET /api/v1/views/customer-portal/{subdomain}?sections=site,menu,profile
```
