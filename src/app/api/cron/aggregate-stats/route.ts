/**
 * Cron endpoint: Aggregate order stats into read model tables.
 *
 * Called every 5 minutes by external cron to pre-compute:
 * - DailyOrderStats: per-admin, per-day order aggregates
 * - AdminDashboardCounters: per-admin dashboard summary counters
 *
 * Security: Requires CRON_SECRET in Authorization header.
 */

import { createPublicApiRoute } from '@/modules/shared/http'
import { UnauthorizedError, InternalError } from '@/modules/shared/errors'
import { db } from '@/modules/shared/db'
import { upsertDailyOrderStats, upsertDashboardCounters } from '@/modules/orders/infrastructure/order-stats-read-model'

export const GET = createPublicApiRoute(async ({ request }) => {
  // Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new InternalError('CRON_SECRET not configured')
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError('Unauthorized')
  }

  const errors: string[] = []
  let adminsProcessed = 0
  let dailyStatsUpserted = 0

  // Get all active admins that need counters
  const activeAdmins = await db.admin.findMany({
    where: {
      isActive: true,
      role: { in: ['SUPER_ADMIN', 'MIDDLE_ADMIN'] },
      deletedAt: null,
    },
    select: { id: true, role: true },
  })

  // Aggregate stats for yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  // Aggregate today's partial stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const admin of activeAdmins) {
    try {
      // Upsert daily stats for yesterday (complete day)
      await upsertDailyOrderStats(admin.id, yesterday)
      dailyStatsUpserted++

      // Upsert daily stats for today (partial, will be updated every run)
      await upsertDailyOrderStats(admin.id, today)
      dailyStatsUpserted++

      // Upsert dashboard counters
      await upsertDashboardCounters(admin.id)
      adminsProcessed++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Admin ${admin.id}: ${message}`)
    }
  }

  return {
    data: {
      adminsProcessed,
      dailyStatsUpserted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    },
  }
})
