/**
 * Cron endpoint: Process pending async jobs.
 *
 * Called periodically (e.g., every minute) to process pending
 * jobs from the async_jobs table.
 *
 * Security: Requires CRON_SECRET in Authorization header.
 * Processes up to 10 jobs per run.
 */

import { createPublicApiRoute, UnauthorizedError, InternalError } from '@/modules/shared'
import { jobExecutor } from '@/modules/shared/jobs'

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

  const result = await jobExecutor.processPendingJobs(10)

  return {
    data: {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      retried: result.retried,
      timestamp: new Date().toISOString(),
    },
  }
})
