/**
 * GET /api/customers/orders/[id] — Customer order tracking.
 *
 * Thin route: auth (customer session) → orders module query → DTO.
 * Ownership is enforced inside the module (customerId filter); a foreign/missing
 * order returns 404 (no existence leak). No direct Prisma access here.
 */

import { createCustomerApiRoute } from '@/modules/shared/http'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { executeGetCustomerOrderTracking } from '@/modules/orders'

export const GET = createCustomerApiRoute({
  handler: async ({ customer, params }) => {
    const orderId = params?.id
    if (!orderId) {
      throw new BadRequestError('Order ID is required')
    }

    const order = await executeGetCustomerOrderTracking({
      customerId: customer.id,
      orderId,
    })

    if (!order) {
      throw new NotFoundError('Order')
    }

    return { data: order }
  },
})
