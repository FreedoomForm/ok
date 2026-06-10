/**
 * Complete Order Command — Application layer.
 *
 * Handles marking an order as DELIVERED by the courier.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { findOrderForCourier, completeOrder, logOrderEvent, logAction } from '../../infrastructure/courier.repository'
import type { CompleteOrderResult } from '../../contracts'

export interface CompleteOrderCommand {
  user: AuthUser
  orderId: string
}

/**
 * Execute the Complete Order command.
 */
export async function executeCompleteOrder(
  command: CompleteOrderCommand,
): Promise<CompleteOrderResult> {
  const { user, orderId } = command

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  const order = await findOrderForCourier(orderId, user.id)
  if (!order) {
    throw new NotFoundError('Order', orderId)
  }

  if (order.courierId !== user.id) {
    throw new ForbiddenError('This is not your order')
  }

  const result = await completeOrder(orderId)

  // Log the event
  await logOrderEvent(orderId, user.id, 'DELIVERY_COMPLETED', 'Courier completed delivery', order.orderStatus, 'DELIVERED')
  await logAction(user.id, 'COMPLETE_ORDER', 'ORDER', orderId, 'Courier completed order')

  return result
}
