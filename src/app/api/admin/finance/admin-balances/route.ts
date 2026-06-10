/**
 * Finance Admin Balances API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get admin salary balances (via executeGetAdminBalances query)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetAdminBalances } from '@/modules/finance'

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const asOfRaw = searchParams.get('asOf')
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')

    const asOf =
      asOfRaw && !Number.isNaN(new Date(asOfRaw).getTime()) ? new Date(asOfRaw) : new Date()

    const from =
      fromRaw && !Number.isNaN(new Date(fromRaw).getTime())
        ? startOfDayUtc(new Date(fromRaw))
        : null

    const to =
      toRaw && !Number.isNaN(new Date(toRaw).getTime())
        ? new Date(startOfDayUtc(new Date(toRaw)).getTime() + 24 * 60 * 60 * 1000)
        : from
          ? new Date(from.getTime() + 24 * 60 * 60 * 1000)
          : null

    const result = await executeGetAdminBalances({
      user,
      asOf,
      from,
      to,
    })

    return { data: result }
  },
})
