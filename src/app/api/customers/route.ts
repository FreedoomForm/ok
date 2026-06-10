import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const customers = await db.customer.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        calories: true,
        deliveryDays: true,
        preferences: true,
      },
    })

    return { data: customers }
  },
})
