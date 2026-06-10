import { createCustomerApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { toggleCustomerPlan } from '@/modules/sites'

export const PATCH = createCustomerApiRoute({
  handler: async ({ customer, request }) => {
    const body = await request.json().catch(() => ({}))
    const active = typeof body.active === 'boolean' ? body.active : null

    if (active === null) {
      throw new BadRequestError('`active` boolean is required')
    }

    const result = await toggleCustomerPlan(customer.id, active)
    return { data: result }
  },
})
