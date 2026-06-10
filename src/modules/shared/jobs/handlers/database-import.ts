/**
 * Job handler: database-import
 *
 * Wraps the existing database import logic for async processing.
 * Currently a stub that logs execution — the actual import logic
 * can be wired in later by delegating to the existing import module.
 */

import type { AsyncJobRow } from '../job.repository'
import { logger } from '@/modules/shared/logger'

export async function handleDatabaseImport(job: AsyncJobRow): Promise<{ result: unknown }> {
  logger.info(`Job type database-import executed`, {
    jobId: job.id,
    input: job.input,
  })

  // Stub: actual import logic would go here
  // e.g., call the existing database-import-xlsx endpoint logic
  return {
    result: {
      message: 'Database import completed (stub)',
      imported: 0,
    },
  }
}
