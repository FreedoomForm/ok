/**
 * Cron endpoint: Process outbox events.
 *
 * Called periodically (e.g., every minute) to process pending
 * domain events from the outbox_events table.
 *
 * Security: Requires CRON_SECRET in Authorization header.
 */

import { createPublicApiRoute } from '@/modules/shared/http'
import { UnauthorizedError, InternalError } from '@/modules/shared/errors'
import { processOutboxEvents } from '@/modules/shared/events'

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

  const result = await processOutboxEvents()

  return {
    data: {
      processed: result.processed,
      published: result.published,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    },
  }
})
