/**
 * Get Order Detail Query — Application layer.
 *
 * Resolves role-based access control for viewing a single order,
 * then delegates to the repository.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { db } from '@/modules/shared/db'
import type { AuthUser } from '@/modules/shared/auth'
import {
  getOrderDetail,
  type GetOrderDetailInput,
} from '../../infrastructure/order.repository'
import type { OrderDetail } from '../../contracts'
import { ForbiddenError, NotFoundError } from '@/modules/shared/errors'

export interface GetOrderDetailQuery {
  user: AuthUser
  orderId: string
}

/**
 * Verify the user has permission to view the given order.
 * Throws ForbiddenError if access is denied.
 */
async function authorizeAccess(
  user: AuthUser,
  orderAdminId: string | null,
): Promise<void> {
  // SUPER_ADMIN can view all orders
  if (user.role === 'SUPER_ADMIN') return

  if (user.role === 'LOW_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    const inGroup =
      !!orderAdminId && !!groupAdminIds && groupAdminIds.includes(orderAdminId)
    if (!inGroup) {
      throw new ForbiddenError('Insufficient permissions to view this order')
    }
    return
  }

  if (user.role === 'MIDDLE_ADMIN') {
    const lowAdmins = await db.admin.findMany({
      where: { createdBy: user.id, role: 'LOW_ADMIN' },
      select: { id: true },
    })
    const allowedAdminIds = [user.id, ...lowAdmins.map((a) => a.id)]
    if (!orderAdminId || !allowedAdminIds.includes(orderAdminId)) {
      throw new ForbiddenError('Insufficient permissions to view this order')
    }
    return
  }

  // COURIER — handled separately (check courierId, not adminId)
  // This is handled at the route level where we check order.courierId === user.id
}

/**
 * Execute the Get Order Detail query.
 *
 * First fetches the order to check ownership, then verifies
 * the user has access based on their role.
 */
export async function executeGetOrderDetail(
  query: GetOrderDetailQuery,
): Promise<OrderDetail> {
  const { user, orderId } = query

  // For COURIER role, we need a different access check
  if (user.role === 'COURIER') {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, courierId: true },
    })
    if (!order) {
      throw new NotFoundError('Order', orderId)
    }
    if (order.courierId !== user.id) {
      throw new ForbiddenError('Couriers can only view orders assigned to them')
    }
  } else {
    // For admin roles, first fetch the order to check adminId ownership
    const orderForAuth = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, adminId: true },
    })
    if (!orderForAuth) {
      throw new NotFoundError('Order', orderId)
    }
    await authorizeAccess(user, orderForAuth.adminId)
  }

  // Now fetch the full order detail using the repository
  // For non-SUPER_ADMIN we still need scoped IDs for the repository query
  let scopedAdminIds: string[] | null = null
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'COURIER') {
    const groupAdminIds = await getGroupAdminIds(user)
    scopedAdminIds = groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
  }

  const input: GetOrderDetailInput = { orderId, scopedAdminIds }
  const result = await getOrderDetail(input)

  if (!result) {
    throw new NotFoundError('Order', orderId)
  }

  return result
}
