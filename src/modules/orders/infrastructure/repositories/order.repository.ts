// Repository interface — domain-driven. Implementation is in Prisma adapter.
// Domain layer defines the contract, infrastructure implements it.

import { Order } from '../../domain/order.entity';

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByNumber(orderNumber: number): Promise<Order | null>;
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  getNextOrderNumber(adminId: string): Promise<number>;
}
