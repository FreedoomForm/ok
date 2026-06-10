/**
 * Order Detail API — GET (detail) + PATCH (update by action)
 *
 * Both endpoints use `createApiRoute` + orders module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetOrderDetail, executeUpdateOrderStatus } from '@/modules/orders'
import { BadRequestError } from '@/modules/shared/errors'

// ── GET /api/orders/[orderId] — Get order detail ─────────────────────────────

export const GET = createApiRoute({
  handler: async ({ user, params }) => {
    const orderId = params?.orderId
    if (!orderId) {
      throw new BadRequestError('Order ID is required')
    }

    const order = await executeGetOrderDetail({ user, orderId })
    return { data: order }
  },
})

// ── PATCH /api/orders/[orderId] — Update order by action ─────────────────────

export const PATCH = createApiRoute({
  handler: async ({ request, user, params }) => {
    const orderId = params?.orderId
    if (!orderId) {
      throw new BadRequestError('Order ID is required')
    }

    const body = await request.json()
    const { action, ...details } = body

    if (!action) {
      throw new BadRequestError('Action is required')
    }

    const updatedOrder = await executeUpdateOrderStatus({
      user,
      orderId,
      action,
      details,
      amountReceived: details.amountReceived,
    })

    return { data: updatedOrder }
  },
})
