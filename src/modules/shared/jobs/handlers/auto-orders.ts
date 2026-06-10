/**
 * Job handler: auto-orders
 *
 * Wraps the auto-orders generation logic for async processing.
 * Currently a stub that logs execution — the actual auto-orders
 * logic can be wired in later.
 */

import type { AsyncJobRow } from '../job.repository'
import { logger } from '@/modules/shared/logger'

export async function handleAutoOrders(job: AsyncJobRow): Promise<{ result: unknown }> {
  logger.info(`Job type auto-orders executed`, {
    jobId: job.id,
    input: job.input,
  })

  // Stub: actual auto-orders logic would go here
  // e.g., generate orders for all active customers with autoOrdersEnabled
  return {
    result: {
      message: 'Auto-orders generation completed (stub)',
      ordersCreated: 0,
    },
  }
}
