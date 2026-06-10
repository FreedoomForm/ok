import { createCustomerApiRoute } from '@/modules/shared/http'
import { executeGetCustomerProfile, updateCustomerProfile } from '@/modules/sites'

export const GET = createCustomerApiRoute({
  handler: async ({ customer }) => {
    const profile = await executeGetCustomerProfile({ customerId: customer.id })
    return { data: profile }
  },
})

export const PATCH = createCustomerApiRoute({
  handler: async ({ customer, request }) => {
    const body = await request.json()
    const { name, address, preferences, calories, deliveryDays, googleMapsLink } = body

    const updated = await updateCustomerProfile(customer.id, {
      name,
      address,
      preferences,
      calories,
      deliveryDays,
      googleMapsLink,
    })

    return { data: updated }
  },
})
