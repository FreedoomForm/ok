# Views (BFF / View API) — Backend Design System v1.0 §1.4

Views are aggregation endpoints that combine data from multiple modules
for a specific screen. They do NOT contain business logic — they only
orchestrate module queries and assemble responses.

## Rules

1. Views only call public APIs of modules (never internals).
2. Views enforce their own request tree contract (B0/B1/B2/B3).
3. Views have a strict budget: p95 latency, max DB queries, max payload size.
4. Views do NOT modify state. They are read-only.
5. Views return partial data if B2/B3 sections fail (graceful degradation).

## Example

```ts
// views/dashboard.view.ts
import { ListOrdersHandler } from '@/modules/orders/application/queries/list-orders.query';
import { ListCustomersHandler } from '@/modules/customers/application/queries/list-customers.query';

export class DashboardView {
  constructor(
    private listOrders: ListOrdersHandler,
    private listCustomers: ListCustomersHandler,
  ) {}

  async render(user: UserContext): Promise<DashboardViewData> {
    // B0: critical data first
    const [orders, customers] = await Promise.all([
      this.listOrders.execute({ adminId: user.id, limit: 10 }),
      this.listCustomers.execute({ adminId: user.id, limit: 5 }),
    ]);

    // B1: stats (cached)
    const stats = await this.getStatsCached(user.id);

    return {
      data: { orders, customers, stats },
      meta: { requestId: generateRequestId() },
    };
  }
}
```
