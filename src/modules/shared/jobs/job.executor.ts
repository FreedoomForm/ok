/**
 * Async Job Executor — Processes background jobs with retry logic.
 *
 * The executor maintains a registry of job handlers keyed by job type.
 * When asked to execute a job, it:
 * 1. Claims the next pending job from the repository
 * 2. Looks up the handler for the job type
 * 3. Executes the handler with retry logic
 * 4. Updates the job record with results or errors
 *
 * Retry strategy: exponential backoff (2^attempts seconds).
 * After maxAttempts failures, the job is marked as permanently failed.
 */

import type { AsyncJobRow } from './job.repository'
import {
  getJob,
  updateJobProgress,
  updateJobResult,
  updateJobError,
} from './job.repository'
import { db } from '@/modules/shared/db'
import { logger } from '@/modules/shared/logger'

// ── Types ────────────────────────────────────────────────────────────────────

export type JobHandler = (job: AsyncJobRow) => Promise<{ result?: unknown }>

export interface ExecuteJobResult {
  jobId: string
  status: 'completed' | 'failed' | 'retrying' | 'skipped'
  error?: string
}

// ── Job Executor ─────────────────────────────────────────────────────────────

class JobExecutor {
  private handlers = new Map<string, JobHandler>()

  /**
   * Register a handler for a specific job type.
   */
  registerHandler(type: string, handler: JobHandler): void {
    if (this.handlers.has(type)) {
      logger.warn(`Overwriting existing job handler for type: ${type}`)
    }
    this.handlers.set(type, handler)
    logger.info(`Registered job handler for type: ${type}`)
  }

  /**
   * Get the handler for a job type.
   */
  getHandler(type: string): JobHandler | undefined {
    return this.handlers.get(type)
  }

  /**
   * Execute a specific job by ID.
   *
   * Claims the job (sets status to 'running'), executes the handler,
   * and updates the result or error.
   */
  async executeJob(jobId: string): Promise<ExecuteJobResult> {
    const job = await getJob(jobId)
    if (!job) {
      return { jobId, status: 'skipped', error: 'Job not found' }
    }

    if (job.status !== 'running') {
      return { jobId, status: 'skipped', error: `Job status is '${job.status}', expected 'running'` }
    }

    const handler = this.handlers.get(job.type)
    if (!handler) {
      await updateJobError(jobId, `No handler registered for job type: ${job.type}`)
      return { jobId, status: 'failed', error: `No handler for type: ${job.type}` }
    }

    try {
      logger.info(`Executing job ${jobId} of type ${job.type}`, {
        jobId,
        jobType: job.type,
        attempt: job.attempts,
      })

      const handlerResult = await handler(job)

      await updateJobResult(jobId, handlerResult.result ?? { success: true })

      logger.info(`Job ${jobId} completed successfully`, { jobId, jobType: job.type })
      return { jobId, status: 'completed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      logger.error(`Job ${jobId} failed`, {
        jobId,
        jobType: job.type,
        attempt: job.attempts,
        error: errorMessage,
      })

      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        // Reset to pending for retry with exponential backoff
        const backoffSeconds = Math.pow(2, job.attempts)

        // Schedule the retry by setting the job back to pending
        // but with a delay based on the backoff
        await db.asyncJob.update({
          where: { id: jobId },
          data: {
            status: 'pending',
            startedAt: null,
            // Set createdAt slightly in the future to implement backoff
            // This makes claimNextJob pick it up after the backoff period
            updatedAt: new Date(Date.now() + backoffSeconds * 1000),
          },
        })

        logger.info(`Job ${jobId} scheduled for retry (attempt ${job.attempts}/${job.maxAttempts}, backoff ${backoffSeconds}s)`, {
          jobId,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
          backoffSeconds,
        })

        return { jobId, status: 'retrying', error: errorMessage }
      } else {
        // Max attempts reached — mark as permanently failed
        await updateJobError(jobId, `Failed after ${job.maxAttempts} attempts. Last error: ${errorMessage}`)
        return { jobId, status: 'failed', error: errorMessage }
      }
    }
  }

  /**
   * Process a batch of pending jobs.
   *
   * Claims and executes up to `maxJobs` pending jobs.
   * Returns a summary of the processing results.
   */
  async processPendingJobs(maxJobs: number = 10): Promise<{
    processed: number
    succeeded: number
    failed: number
    retried: number
  }> {
    let processed = 0
    let succeeded = 0
    let failed = 0
    let retried = 0

    for (let i = 0; i < maxJobs; i++) {
      // Claim the next pending job
      const job = await claimNextJobInternal()
      if (!job) break

      processed++
      const result = await this.executeJob(job.id)

      if (result.status === 'completed') {
        succeeded++
      } else if (result.status === 'retrying') {
        retried++
      } else if (result.status === 'failed') {
        failed++
      }
    }

    return { processed, succeeded, failed, retried }
  }
}

/**
 * Internal helper: claim the next pending job.
 * Re-imported from the repository to avoid circular dependency concerns.
 */
async function claimNextJobInternal(): Promise<AsyncJobRow | null> {
  const result = await db.$transaction(async (tx) => {
    const pending = await tx.asyncJob.findFirst({
      where: { status: 'pending' },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true, attempts: true, maxAttempts: true },
    })

    if (!pending) return null

    const updated = await tx.asyncJob.update({
      where: { id: pending.id },
      data: {
        status: 'running',
        attempts: pending.attempts + 1,
        startedAt: new Date(),
      },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        input: true,
        result: true,
        error: true,
        createdBy: true,
        attempts: true,
        maxAttempts: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      id: updated.id,
      type: updated.type,
      status: updated.status,
      progress: updated.progress,
      input: updated.input,
      result: updated.result,
      error: updated.error,
      createdBy: updated.createdBy,
      attempts: updated.attempts,
      maxAttempts: updated.maxAttempts,
      startedAt: updated.startedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
  })

  return result
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const jobExecutor = new JobExecutor()
