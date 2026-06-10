import { createCustomerApiRoute, type CookieOption } from '@/modules/shared/http'
import { NotFoundError, ForbiddenError } from '@/modules/shared/errors'
import { db } from '@/lib/db'

export const GET = createCustomerApiRoute({
  handler: async ({ customer, params }) => {
    const { id } = params ?? {}
    const order = await db.order.findUnique({
      where: { id },
      include: {
        courier: {
          select: {
            name: true,
            phone: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundError('Order')
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenError('Access denied')
    }

    return { data: order }
  },
})
