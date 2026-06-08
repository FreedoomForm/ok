// Read model interface — for fast list queries.
// Implementation uses Prisma with indexed columns (idx_orders_admin_delivery_status etc).

import { PaginatedOrders, OrderListItem, OrderDetail } from '../../contracts/order.dto';

export interface OrderReadModel {
  list(params: {
    adminId?: string;
    courierId?: string;
    status?: string;
    date?: string;
    from?: string;
    to?: string;
    customerId?: string;
    limit: number;
    cursor?: string | null;
    sort?: string;
  }): Promise<PaginatedOrders>;

  getDetail(orderId: string): Promise<OrderDetail | null>;
}
