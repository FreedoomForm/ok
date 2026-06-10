/**
 * Finance Salary API Route — Migrated to createApiRoute pattern.
 *
 * POST — Pay salary to staff (via executePaySalary command)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executePaySalary } from '@/modules/finance'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const { adminId, recipientAdminId, amount } = body

    const result = await executePaySalary({
      user,
      data: {
        adminId,
        recipientAdminId,
        amount,
      },
    })

    return { data: result }
  },
})
