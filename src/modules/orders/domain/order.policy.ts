/**
 * Order Policy — Domain layer.
 *
 * Authorization policies that combine role checks with
 * business rules for order operations.
 */

import type { AdminRole } from '@/modules/shared/auth/roles'
import type { OrderStatus } from '../contracts'

export interface OrderPolicyUser {
  id: string
  role: AdminRole
}

export interface OrderPolicyOrder {
  id: string
  orderStatus: OrderStatus
  courierId: string | null
  adminId: string | null
}

export class OrderPolicy {
  /**
   * Check if a user can change the status of an order.
   * Combines role-based access with order ownership checks.
   */
  static canChangeStatus(
    user: OrderPolicyUser,
    order: OrderPolicyOrder,
    newStatus: OrderStatus,
    groupAdminIds: string[] | null,
  ): { allowed: boolean; reason?: string } {
    // SUPER_ADMIN can change any order status
    if (user.role === 'SUPER_ADMIN') return { allowed: true }

    // COURIER can only change status of orders assigned to them
    if (user.role === 'COURIER') {
      if (order.courierId !== user.id) {
        return { allowed: false, reason: 'Courier can only modify assigned orders' }
      }
      const courierAllowedStatuses: OrderStatus[] = ['IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED']
      if (!courierAllowedStatuses.includes(newStatus)) {
        return { allowed: false, reason: 'Courier cannot set this status' }
      }
      return { allowed: true }
    }

    // MIDDLE_ADMIN can change status of orders in their group
    if (user.role === 'MIDDLE_ADMIN') {
      if (groupAdminIds && order.adminId && !groupAdminIds.includes(order.adminId)) {
        return { allowed: false, reason: 'Order not in admin group' }
      }
      return { allowed: true }
    }

    // LOW_ADMIN — limited status changes
    if (user.role === 'LOW_ADMIN') {
      if (newStatus === 'IN_DELIVERY') return { allowed: true }
      if (groupAdminIds && order.adminId && groupAdminIds.includes(order.adminId)) {
        return { allowed: true }
      }
      return { allowed: false, reason: 'Low admin cannot modify this order' }
    }

    return { allowed: false, reason: 'Insufficient role' }
  }

  /**
   * Check if a user can delete (soft-delete) an order.
   */
  static canDelete(user: OrderPolicyUser, order: OrderPolicyOrder, groupAdminIds: string[] | null): { allowed: boolean; reason?: string } {
    if (user.role === 'SUPER_ADMIN') return { allowed: true }
    if (user.role === 'COURIER') return { allowed: false, reason: 'Couriers cannot delete orders' }

    if (groupAdminIds && order.adminId && groupAdminIds.includes(order.adminId)) {
      return { allowed: true }
    }

    return { allowed: false, reason: 'Order not in admin group' }
  }

  /**
   * Check if a courier can accept (start delivery of) an order.
   */
  static canAcceptOrder(user: OrderPolicyUser, order: OrderPolicyOrder): { allowed: boolean; reason?: string } {
    if (user.role !== 'COURIER') {
      return { allowed: false, reason: 'Only couriers can accept orders' }
    }
    if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'NEW') {
      return { allowed: false, reason: `Order in status ${order.orderStatus} cannot be accepted` }
    }
    return { allowed: true }
  }
}
