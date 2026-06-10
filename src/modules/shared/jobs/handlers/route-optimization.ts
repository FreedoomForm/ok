/**
 * Job handler: route-optimization
 *
 * Wraps the ORS route optimization logic for async processing.
 * Currently a stub that logs execution — the actual optimization
 * logic can be wired in later.
 */

import type { AsyncJobRow } from '../job.repository'
import { logger } from '@/modules/shared/logger'

export async function handleRouteOptimization(job: AsyncJobRow): Promise<{ result: unknown }> {
  logger.info(`Job type route-optimization executed`, {
    jobId: job.id,
    input: job.input,
  })

  // Stub: actual route optimization logic would go here
  // e.g., call the ORS optimization API
  return {
    result: {
      message: 'Route optimization completed (stub)',
      optimizedRoutes: 0,
    },
  }
}
