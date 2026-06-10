/**
 * Fail Order Command — Application layer.
 *
 * Handles marking an order as FAILED by the courier.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { findOrderForCourier, failOrder, logOrderEvent, logAction } from '../../infrastructure/courier.repository'
import type { FailOrderData, FailOrderResult } from '../../contracts'

export interface FailOrderCommand {
  user: AuthUser
  orderId: string
  data?: FailOrderData
}

/**
 * Execute the Fail Order command.
 */
export async function executeFailOrder(
  command: FailOrderCommand,
): Promise<FailOrderResult> {
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

  const result = await failOrder(orderId)

  // Log the event
  await logOrderEvent(orderId, user.id, 'STATUS_CHANGED', 'Courier marked order as failed', order.orderStatus, 'FAILED')
  await logAction(user.id, 'FAIL_ORDER', 'ORDER', orderId, 'Courier failed order')

  return result
}
