/**
 * Client detail — DELETE (soft-delete single) + PATCH (update)
 *
 * Both endpoints use `createApiRoute` + customers module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import {
  executeSoftDeleteCustomers,
  executeUpdateCustomer,
  executeGetCustomerDetail,
} from '@/modules/customers'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'

// ── DELETE /api/admin/clients/[id] — Soft-delete single client ───────────────

export const DELETE = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, params }) => {
    const clientId = params?.id
    if (!clientId) {
      throw new BadRequestError('Client ID is required')
    }

    const result = await executeSoftDeleteCustomers({ user, clientIds: [clientId] })

    return {
      data: {
        message: 'Клиент перемещен в корзину',
        ...result,
      },
    }
  },
})

// ── PATCH /api/admin/clients/[id] — Update client ───────────────────────────

export const PATCH = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user, params }) => {
    const clientId = params?.id
    if (!clientId) {
      throw new BadRequestError('Client ID is required')
    }

    const body = await request.json()

    const client = await executeUpdateCustomer({
      user,
      customerId: clientId,
      data: body,
    })

    return { data: client, message: 'Клиент успешно обновлен' }
  },
})
