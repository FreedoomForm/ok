# Модульная структура (Modular Monolith + Clean Architecture)

Каждый модуль — это автономная библиотека. Он не импортирует внутренности других модулей напрямую. Взаимодействие через `shared/` или явные контракты (contracts).

## Структура модуля

```text
orders/
├── api/                    — HTTP routes, controllers, validation (Next.js App Router)
│   ├── orders.routes.ts
│   ├── orders.controller.ts
│   ├── orders.schemas.ts   — Zod / valibot request schemas
│   └── orders.presenter.ts — response formatting (DTO mapping)
│
├── application/            — Use cases, orchestration
│   ├── commands/
│   │   ├── create-order.command.ts
│   │   ├── update-status.command.ts
│   │   └── archive-order.command.ts
│   ├── queries/
│   │   ├── get-order-detail.query.ts
│   │   └── list-orders.query.ts
│   └── services/
│       └── order-pricing.service.ts
│
├── domain/                 — Бизнес-правила, не зависящие от инфраструктуры
│   ├── order.entity.ts
│   ├── order.policy.ts     — права доступа к заказу
│   ├── order.errors.ts     — доменные ошибки (codes)
│   └── order.events.ts     — domain events (order.created, order.status_changed)
│
├── infrastructure/          — Технические детали
│   ├── order.repository.ts  — Prisma / raw SQL адаптер
│   ├── order.mapper.ts      — Prisma row ↔ Domain entity
│   └── order.read-model.ts  — денормализованные данные для list / dashboard
│
├── contracts/
│   ├── order.dto.ts         — TypeScript DTO (Summary, ListItem, Detail)
│   └── order.openapi.yaml   — контракт endpoint'ов (опционально)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
│
├── public/
│   └── index.ts             — публичный API модуля (только то, что экспортируется наружу)
│
└── README.md               — краткое описание модуля, зависимости, owners
```

## Правила

1. **Domain не знает про HTTP, Next.js, Prisma, Redis.**
2. **Application оркестрирует use cases, но не принимает HTTP-решения.**
3. **API layer только парсит request, валидирует, вызывает use case, форматирует response.**
4. **Infrastructure реализует интерфейсы, объявленные в Domain / Application.**
5. **Модуль импортирует только `public/` API других модулей или `shared/`.**
6. **Каждый модуль имеет свой README, DTO, errors, policies.**
7. **Тяжёлые запросы (dashboard, report) делаются через `src/views/` (BFF / View API), а не напрямую через module queries.**

## Примеры команд и запросов

### Команда (изменяет состояние)
```ts
// modules/orders/application/commands/create-order.command.ts
export class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly adminId: string,
    public readonly items: OrderItemInput[],
    public readonly deliveryDate: Date,
  ) {}
}

export class CreateOrderHandler {
  constructor(
    private orderRepo: OrderRepository,
    private policy: OrderPolicy,
    private eventBus: EventBus,
  ) {}

  async execute(cmd: CreateOrderCommand): Promise<OrderSummary> {
    // 1. Проверка прав
    await this.policy.canCreate(cmd.adminId, cmd.customerId);
    // 2. Создание entity
    const order = Order.create({ ...cmd });
    // 3. Сохранение
    const saved = await this.orderRepo.save(order);
    // 4. Публикация события (outbox)
    await this.eventBus.publish(new OrderCreatedEvent(saved.id));
    // 5. Возврат DTO
    return OrderMapper.toSummary(saved);
  }
}
```

### Запрос (только чтение)
```ts
// modules/orders/application/queries/list-orders.query.ts
export class ListOrdersQuery {
  constructor(
    public readonly adminId: string,
    public readonly status?: OrderStatus,
    public readonly cursor?: string,
    public readonly limit: number = 25,
  ) {}
}

export class ListOrdersHandler {
  constructor(private orderRepo: OrderReadModel) {}

  async execute(q: ListOrdersQuery): Promise<Paginated<OrderListItem>> {
    // Только чтение из read-model, нет domain logic
    return this.orderRepo.listByAdmin(q.adminId, {
      status: q.status,
      cursor: q.cursor,
      limit: Math.min(q.limit, 100),
    });
  }
}
```

## Взаимодействие между модулями

Плохо (импорт внутренностей):
```ts
import { OrderRepository } from '../orders/infrastructure/order.repository.ts';
```

Хорошо (через контракт / shared):
```ts
import { type OrderSummary } from '../orders/contracts/order.dto.ts';
// или
import { OrderCreatedEvent } from '../orders/domain/order.events.ts';
// event handler в другом модуле подписывается через shared/event-bus
```

## Примечание для Next.js App Router

В текущем проекте (Next.js) модули живут в `src/modules/`. API routes в `src/app/api/` могут быть тонкими обёртками (thin controllers) над модулями:

```ts
// src/app/api/orders/route.ts
import { ListOrdersHandler } from '@/modules/orders/application/queries/list-orders.query';
import { getCurrentAdmin } from '@/shared/auth/session';

export async function GET(req: Request) {
  const admin = await getCurrentAdmin(req);
  const { searchParams } = new URL(req.url);
  const handler = container.get(ListOrdersHandler);
  const result = await handler.execute({
    adminId: admin.id,
    status: searchParams.get('status') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: parseInt(searchParams.get('limit') || '25', 10),
  });
  return Response.json({ data: result.items, meta: { page: result.page } });
}
```

Это позволяет постепенно переносить логику из `src/app/api/*` в `src/modules/*` без полного rewrite.
