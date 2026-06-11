// Application command — orchestrates domain logic, calls infrastructure.
// No HTTP knowledge. Only domain + repository + policy + event bus.

import { Order, OrderCore } from '../../domain/order.entity';
import { OrderPolicy, UserContext } from '../../domain/order.policy';
import { OrderDomainError } from '../../domain/order.errors';
import { OrderCreatedEvent } from '../../domain/order.events';
import { OrderRepository } from '../../infrastructure/repositories/order.repository';
import { OrderMapper } from '../../infrastructure/mappers/order.mapper';
import { OrderSummary } from '../../contracts/order.dto';

export interface CreateOrderInput {
  customerId: string;
  adminId: string;
  deliveryDate: Date;
  deliveryAddress: string;
  calories: number;
  quantity: number;
  paymentMethod: string;
  notes?: string;
  specialFeatures?: string;
}

export class CreateOrderHandler {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly policy: OrderPolicy,
    private readonly eventBus: { publish: (event: unknown) => Promise<void> },
  ) {}

  async execute(
    user: UserContext,
    input: CreateOrderInput,
  ): Promise<OrderSummary> {
    // 1. Permission check (business rule: admin can create for their customers)
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN' && user.role !== 'LOW_ADMIN') {
      throw new OrderDomainError(
        'ORDER_PERMISSION_DENIED',
        'Only admins can create orders',
      );
    }

    // 2. Generate order number (infrastructure concern, but atomic here)
    const nextNumber = await this.orderRepo.getNextOrderNumber(input.adminId);

    const core: OrderCore = {
      id: crypto.randomUUID(), // Use crypto.randomUUID() in Node 14.17+
      orderNumber: nextNumber,
      status: 'NEW',
      customerId: input.customerId,
      adminId: input.adminId,
      courierId: null,
      deliveryDate: input.deliveryDate,
      deliveryAddress: input.deliveryAddress,
      paymentStatus: 'UNPAID',
      paymentMethod: input.paymentMethod as any,
      isPrepaid: false,
      quantity: input.quantity,
      calories: input.calories,
      version: 1,
    };

    const order = new Order(core);

    // 3. Persist
    await this.orderRepo.save(order);

    // 4. Publish event (outbox pattern via event bus)
    await this.eventBus.publish(
      new OrderCreatedEvent(order.id, order.customerId, order.adminId),
    );

    // 5. Return DTO
    return OrderMapper.toSummary(order);
  }
}
