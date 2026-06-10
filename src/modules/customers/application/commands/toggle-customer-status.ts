/**
 * Toggle Customer Status Command — Application layer.
 *
 * Handles toggling the `isActive` flag for one or more customers.
 * Also pauses/resumes related orders so couriers won't see inactive clients.
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds, filterCustomerIdsInGroup } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { BatchResult } from '../../contracts'
import { BadRequestError } from '@/modules/shared/errors'
import { OrderStatus } from '@prisma/client'

const PAUSE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PENDING,
  OrderStatus.IN_PROCESS,
  OrderStatus.IN_DELIVERY,
]

export interface ToggleCustomerStatusCommand {
  user: AuthUser
  clientIds: string[]
  isActive: boolean
}

export async function executeToggleCustomerStatus(
  command: ToggleCustomerStatusCommand,
): Promise<BatchResult> {
  const { user, clientIds, isActive } = command

  if (!clientIds || clientIds.length === 0) {
    throw new BadRequestError('Не указаны ID клиентов')
  }

  if (typeof isActive !== 'boolean') {
    throw new BadRequestError('Не указан статус активности')
  }

  const scopedCreatedBy = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
  const allowedIds = scopedCreatedBy
    ? await filterCustomerIdsInGroup(clientIds, scopedCreatedBy)
    : clientIds

  const skippedCount = clientIds.length - allowedIds.length

  // Update customers
  const updateResult = await db.customer.updateMany({
    where: { id: { in: allowedIds } },
    data: { isActive },
  })

  // Pause/resume related orders
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const dateScope = {
    OR: [
      { deliveryDate: { gte: todayStart } },
      { deliveryDate: { equals: null }, createdAt: { gte: todayStart } },
    ],
  }

  if (!isActive) {
    // Pause orders
    await db.order.updateMany({
      where: {
        customerId: { in: allowedIds },
        deletedAt: null,
        ...dateScope,
        orderStatus: { in: PAUSE_STATUSES },
      },
      data: { orderStatus: OrderStatus.PAUSED },
    })
  } else {
    // Resume orders
    await db.order.updateMany({
      where: {
        customerId: { in: allowedIds },
        deletedAt: null,
        ...dateScope,
        orderStatus: OrderStatus.PAUSED,
      },
      data: { orderStatus: OrderStatus.NEW },
    })
  }

  return {
    affectedCount: updateResult.count,
    skippedCount,
  }
}
