// Domain entity — Backend Design System v1.0
// Pure business logic. No framework imports.

export type OrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'IN_PROCESS'
  | 'IN_DELIVERY'
  | 'PAUSED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'FAILED';

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface OrderCore {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  customerId: string;
  adminId: string | null;
  courierId: string | null;
  deliveryDate: Date | null;
  deliveryAddress: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  isPrepaid: boolean;
  quantity: number;
  calories: number;
  version: number;
}

export class Order {
  constructor(private readonly core: OrderCore) {}

  get id(): string { return this.core.id; }
  get status(): OrderStatus { return this.core.status; }
  get customerId(): string { return this.core.customerId; }
  get adminId(): string | null { return this.core.adminId; }
  get courierId(): string | null { return this.core.courierId; }
  get version(): number { return this.core.version; }

  canAssignCourier(courierId: string): boolean {
    return this.core.status === 'NEW' || this.core.status === 'PENDING';
  }

  canChangeStatus(newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      NEW: ['PENDING', 'IN_PROCESS', 'CANCELED'],
      PENDING: ['IN_PROCESS', 'CANCELED'],
      IN_PROCESS: ['IN_DELIVERY', 'PAUSED', 'CANCELED'],
      IN_DELIVERY: ['DELIVERED', 'PAUSED', 'FAILED'],
      PAUSED: ['IN_DELIVERY', 'CANCELED'],
      DELIVERED: [],
      CANCELED: [],
      FAILED: [],
    };
    return validTransitions[this.core.status]?.includes(newStatus) ?? false;
  }

  withStatus(newStatus: OrderStatus, newVersion: number): Order {
    if (!this.canChangeStatus(newStatus)) {
      throw new Error(`ORDER_STATUS_INVALID_TRANSITION: ${this.core.status} -> ${newStatus}`);
    }
    return new Order({ ...this.core, status: newStatus, version: newVersion });
  }

  withCourier(courierId: string, newVersion: number): Order {
    if (!this.canAssignCourier(courierId)) {
      throw new Error('ORDER_CANNOT_ASSIGN_COURIER');
    }
    return new Order({ ...this.core, courierId, status: 'IN_PROCESS', version: newVersion });
  }

  toJSON(): OrderCore {
    return { ...this.core };
  }
}
