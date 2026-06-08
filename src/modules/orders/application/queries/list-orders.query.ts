// Application query — Backend Design System v1.0 §1.3 CQRS-lite
// Read-only. No domain state changes. Uses read model for performance.

import { PaginatedOrders, OrderListItem } from '../../contracts/order.dto';
import { OrderReadModel } from '../../infrastructure/repositories/order.read-model';

export interface ListOrdersInput {
  adminId?: string;
  courierId?: string;
  status?: string;
  date?: string; // YYYY-MM-DD
  from?: string;
  to?: string;
  customerId?: string;
  limit: number;
  cursor?: string | null;
  sort?: string; // e.g. '-updatedAt'
}

export class ListOrdersHandler {
  constructor(private readonly readModel: OrderReadModel) {}

  async execute(input: ListOrdersInput): Promise<PaginatedOrders> {
    // Backend Design System: enforce max limit (§13)
    const limit = Math.min(input.limit || 25, 100);

    const result = await this.readModel.list({
      ...input,
      limit,
    });

    return result;
  }
}
