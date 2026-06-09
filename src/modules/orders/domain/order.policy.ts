// Domain policy — who can do what with an order.
// No framework imports. Pure logic.

import { Order } from './order.entity';

export interface UserContext {
  id: string;
  role: 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'WORKER';
  adminId?: string | null; // for COURIER, the parent admin
}

export class OrderPolicy {
  canView(user: UserContext, order: Order): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') {
      return order.adminId === user.id;
    }
    if (user.role === 'COURIER') {
      return order.courierId === user.id || order.adminId === user.adminId;
    }
    return false;
  }

  canEdit(user: UserContext, order: Order): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') {
      return order.adminId === user.id;
    }
    return false;
  }

  canAssignCourier(user: UserContext, order: Order): boolean {
    return this.canEdit(user, order);
  }

  canChangeStatus(user: UserContext, order: Order, newStatus: string): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') {
      return order.adminId === user.id;
    }
    if (user.role === 'COURIER') {
      // Courier can only change delivery-related statuses
      const allowedCourierStatuses = ['IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED'];
      return order.courierId === user.id && allowedCourierStatuses.includes(newStatus);
    }
    return false;
  }

  canDelete(user: UserContext, order: Order): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'MIDDLE_ADMIN') return order.adminId === user.id;
    return false;
  }
}
