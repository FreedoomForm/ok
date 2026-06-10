import { createCustomerApiRoute } from '@/modules/shared/http'
import { executeGetTodayMenu } from '@/modules/sites'

export const GET = createCustomerApiRoute({
  handler: async ({ customer }) => {
    const menu = await executeGetTodayMenu({ customerId: customer.id })
    return { data: menu }
  },
})
