# DTO Уровни — Food Delivery SaaS

## Принцип

Не возвращать одну огромную модель всегда. Каждый endpoint возвращает минимально необходимый набор полей.

---

## Admin DTO

### AdminSummary
```json
{
  "id": "uuid",
  "name": "Alex",
  "role": "MIDDLE_ADMIN"
}
```
Используется: в couriers dropdown, order.assignee

### AdminListItem
```json
{
  "id": "uuid",
  "name": "Alex",
  "email": "alex@example.com",
  "role": "MIDDLE_ADMIN",
  "isActive": true,
  "trialEndsAt": "2026-07-08T00:00:00Z",
  "createdAt": "2026-06-01T12:00:00Z"
}
```
Используется: super-admin list, middle-admins list

### AdminDetail
```json
{
  "id": "uuid",
  "name": "Alex",
  "email": "alex@example.com",
  "role": "MIDDLE_ADMIN",
  "isActive": true,
  "trialEndsAt": "2026-07-08T00:00:00Z",
  "phone": "+998901234567",
  "companyBalance": 1500000,
  "allowedTabs": ["orders", "clients", "warehouse"],
  "createdAt": "2026-06-01T12:00:00Z",
  "updatedAt": "2026-06-08T12:00:00Z"
}
```

---

## Customer DTO

### CustomerSummary
```json
{
  "id": "uuid",
  "name": "Иван",
  "phone": "+998901234567"
}
```

### CustomerListItem
```json
{
  "id": "uuid",
  "name": "Иван",
  "phone": "+998901234567",
  "planType": "CLASSIC",
  "isActive": true,
  "balance": 500000,
  "assignedSet": {
    "id": "uuid",
    "name": "Стандарт"
  },
  "deliveryDays": ["mon", "wed", "fri"],
  "dailyPrice": 85000,
  "createdAt": "2026-05-15T10:00:00Z"
}
```

### CustomerDetail
```json
{
  "id": "uuid",
  "name": "Иван",
  "nickName": "Ваня",
  "phone": "+998901234567",
  "address": "ул. Амир Темур, 15",
  "lat": 41.3111,
  "lng": 69.2797,
  "planType": "CLASSIC",
  "calories": 1800,
  "isActive": true,
  "balance": 500000,
  "assignedSet": { "id": "uuid", "name": "Стандарт" },
  "deliveryDays": ["mon", "wed", "fri"],
  "dailyPrice": 85000,
  "notes": "Без орехов",
  "autoOrdersEnabled": true,
  "preferences": {},
  "orderPattern": {},
  "recentOrders": [],
  "transactions": [],
  "createdAt": "2026-05-15T10:00:00Z"
}
```

---

## Order DTO

### OrderSummary
```json
{
  "id": "uuid",
  "orderNumber": "ORD-001",
  "status": "IN_DELIVERY"
}
```

### OrderListItem
```json
{
  "id": "uuid",
  "orderNumber": "ORD-001",
  "status": "IN_DELIVERY",
  "paymentStatus": "PAID",
  "deliveryDate": "2026-06-08",
  "deliveryTime": "morning",
  "quantity": 1,
  "calories": 1800,
  "amount": 85000,
  "customer": {
    "id": "uuid",
    "name": "Иван",
    "phone": "+998901234567"
  },
  "courier": {
    "id": "uuid",
    "name": "Курьер 1"
  },
  "createdAt": "2026-06-07T18:00:00Z"
}
```

### OrderDetail
```json
{
  "id": "uuid",
  "orderNumber": "ORD-001",
  "status": "IN_DELIVERY",
  "paymentStatus": "PAID",
  "paymentMethod": "CASH",
  "isPrepaid": false,
  "deliveryDate": "2026-06-08",
  "deliveryAddress": "ул. Амир Темур, 15",
  "deliveryTime": "morning",
  "lat": 41.3111,
  "lng": 69.2797,
  "quantity": 1,
  "calories": 1800,
  "specialFeatures": "",
  "notes": "",
  "amount": 85000,
  "amountReceived": null,
  "customer": { "id": "uuid", "name": "Иван", "phone": "+998901234567", "address": "ул. Амир Темур, 15" },
  "courier": { "id": "uuid", "name": "Курьер 1" },
  "timeline": [
    { "eventType": "CREATED", "occurredAt": "2026-06-07T18:00:00Z", "message": "Заказ создан" },
    { "eventType": "STATUS_CHANGED", "occurredAt": "2026-06-08T08:00:00Z", "message": "В доставке" }
  ],
  "routeDistanceKm": 5.2,
  "etaMinutes": 15,
  "sourceChannel": "app",
  "fromAutoOrder": false,
  "createdAt": "2026-06-07T18:00:00Z",
  "updatedAt": "2026-06-08T08:00:00Z"
}
```

---

## WarehouseItem DTO

### IngredientListItem
```json
{
  "id": "uuid",
  "name": "Рис",
  "amount": 50.0,
  "unit": "кг",
  "kcalPerGram": 3.5,
  "pricePerUnit": 12000,
  "priceUnit": "кг"
}
```

### IngredientDetail — то же + история изменений (B2)

---

## Dish DTO

### DishListItem
```json
{
  "id": "uuid",
  "name": "Плов",
  "mealType": "lunch",
  "ingredientCount": 5,
  "totalKcal": 650
}
```

### DishDetail
```json
{
  "id": "uuid",
  "name": "Плов",
  "description": "Узбекский плов",
  "mealType": "lunch",
  "ingredients": [...],
  "calorieMappings": {...}
}
```

---

## MenuSet DTO

### MenuSetListItem
```json
{
  "id": "uuid",
  "name": "Стандарт",
  "menuNumber": 1,
  "isActive": true,
  "groupCount": 3
}
```

### MenuSetDetail
```json
{
  "id": "uuid",
  "name": "Стандарт",
  "description": "Стандартный набор",
  "menuNumber": 1,
  "isActive": true,
  "calorieGroups": {
    "1500": { "dishes": [...] },
    "1800": { "dishes": [...] },
    "2000": { "dishes": [...] }
  }
}
```

---

## Transaction DTO

### TransactionListItem
```json
{
  "id": "uuid",
  "amount": 85000,
  "type": "INCOME",
  "description": "Оплата заказа ORD-001",
  "category": "order_payment",
  "createdAt": "2026-06-08T12:00:00Z"
}
```

---

## Error Response (стандарт)

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Заказ не найден",
    "details": {
      "orderId": "uuid"
    },
    "requestId": "req_01HX..."
  }
}
```

### Error Codes

| Code | HTTP | Описание |
|---|---|---|
| UNAUTHORIZED | 401 | Не авторизован |
| FORBIDDEN | 403 | Нет прав |
| VALIDATION_FAILED | 400 | Ошибка валидации |
| NOT_FOUND | 404 | Ресурс не найден |
| CONFLICT | 409 | Конфликт (дубль email и т.д.) |
| ADMIN_NOT_FOUND | 404 | Админ не найден |
| ADMIN_INACTIVE | 403 | Аккаунт деактивирован |
| TRIAL_EXPIRED | 403 | Триал истёк |
| CLIENT_NOT_FOUND | 404 | Клиент не найден |
| ORDER_NOT_FOUND | 404 | Заказ не найден |
| ORDER_STATUS_INVALID | 400 | Недопустимый статус |
| SET_NOT_FOUND | 404 | Сет не найден |
| INGREDIENT_NOT_FOUND | 404 | Ингредиент не найден |
| DUPLICATE_NAME | 409 | Дублирующееся имя |
| VERSION_CONFLICT | 409 | Конфликт версии |
| RATE_LIMIT_EXCEEDED | 429 | Превышен лимит |
| INTERNAL_ERROR | 500 | Внутренняя ошибка |
