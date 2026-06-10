/**
 * Async Job Infrastructure — Barrel export.
 *
 * Provides the complete job system:
 * - Repository: CRUD operations for AsyncJob records
 * - Executor: Processes jobs with retry logic
 * - Handlers: Job-type-specific processing functions
 */

// Repository
export {
  createJob,
  getJob,
  listJobs,
  updateJobProgress,
  updateJobResult,
  updateJobError,
  claimNextJob,
  type CreateJobInput,
  type ListJobsFilters,
  type ListJobsInput,
  type PaginatedJobsResult,
  type AsyncJobRow,
} from './job.repository'

// Executor
export {
  jobExecutor,
  type JobHandler,
  type ExecuteJobResult,
} from './job.executor'

// Handlers — auto-register when this module is imported
import { jobExecutor } from './job.executor'
import { handleDatabaseImport } from './handlers/database-import'
import { handleRouteOptimization } from './handlers/route-optimization'
import { handleAutoOrders } from './handlers/auto-orders'

// Register initial handlers
jobExecutor.registerHandler('database-import', handleDatabaseImport)
jobExecutor.registerHandler('route-optimization', handleRouteOptimization)
jobExecutor.registerHandler('auto-orders', handleAutoOrders)
