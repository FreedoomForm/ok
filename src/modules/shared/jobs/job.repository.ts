/**
 * Async Job Repository — Data access layer for background job management.
 *
 * Provides CRUD operations for AsyncJob records, including:
 * - Creating new jobs
 * - Querying job status
 * - Updating progress, results, and errors
 * - Claiming pending jobs for worker processing (atomic)
 * - Listing jobs with cursor pagination
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import { encodeCursor, decodeCursor } from '@/modules/shared/validation'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateJobInput {
  type: string
  input?: unknown
  createdBy?: string
}

export interface ListJobsFilters {
  createdBy?: string
  type?: string
  status?: string
}

export interface ListJobsInput {
  filters?: ListJobsFilters
  cursor?: string
  limit?: number
}

export interface PaginatedJobsResult {
  items: AsyncJobRow[]
  nextCursor: string | null
  hasMore: boolean
}

/** Subset of AsyncJob fields returned to API consumers. */
export interface AsyncJobRow {
  id: string
  type: string
  status: string
  progress: number
  input: unknown
  result: unknown
  error: string | null
  createdBy: string | null
  attempts: number
  maxAttempts: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Prisma select preset ─────────────────────────────────────────────────────

const JOB_SELECT = {
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
} as const

type JobRow = Prisma.AsyncJobGetPayload<{ select: typeof JOB_SELECT }>

// ── Transformer ──────────────────────────────────────────────────────────────

function toAsyncJobRow(row: JobRow): AsyncJobRow {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    input: row.input,
    result: row.result,
    error: row.error,
    createdBy: row.createdBy,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── Repository functions ─────────────────────────────────────────────────────

/**
 * Create a new pending job.
 */
export async function createJob(input: CreateJobInput): Promise<AsyncJobRow> {
  const row = await db.asyncJob.create({
    data: {
      type: input.type,
      input: input.input as any ?? undefined,
      createdBy: input.createdBy ?? null,
    },
    select: JOB_SELECT,
  })
  return toAsyncJobRow(row)
}

/**
 * Get a job by ID.
 */
export async function getJob(id: string): Promise<AsyncJobRow | null> {
  const row = await db.asyncJob.findUnique({
    where: { id },
    select: JOB_SELECT,
  })
  return row ? toAsyncJobRow(row) : null
}

/**
 * List jobs with filters and cursor pagination.
 * Sort: createdAt DESC, id DESC (stable sort).
 */
export async function listJobs(input: ListJobsInput): Promise<PaginatedJobsResult> {
  const { filters, cursor, limit = 25 } = input

  const where: Prisma.AsyncJobWhereInput = {}

  if (filters?.createdBy) {
    where.createdBy = filters.createdBy
  }
  if (filters?.type) {
    where.type = filters.type
  }
  if (filters?.status) {
    where.status = filters.status
  }

  // Apply cursor filter
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt as string
      const cursorId = decoded.id as string
      if (cursorCreatedAt && cursorId) {
        where.OR = [
          { createdAt: { lt: new Date(cursorCreatedAt) } },
          { createdAt: { equals: new Date(cursorCreatedAt) }, id: { lt: cursorId } },
        ]
      }
    }
  }

  // Fetch limit + 1 to determine hasMore
  const rows = await db.asyncJob.findMany({
    where,
    select: JOB_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const lastItem = items[items.length - 1]
  const nextCursor = hasMore && lastItem
    ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id })
    : null

  return {
    items: items.map(toAsyncJobRow),
    nextCursor,
    hasMore,
  }
}

/**
 * Update job progress percentage.
 */
export async function updateJobProgress(id: string, progress: number): Promise<void> {
  await db.asyncJob.update({
    where: { id },
    data: { progress: Math.min(100, Math.max(0, progress)) },
  })
}

/**
 * Mark a job as completed with its result.
 */
export async function updateJobResult(id: string, result: unknown): Promise<void> {
  await db.asyncJob.update({
    where: { id },
    data: {
      status: 'completed',
      progress: 100,
      result: result as any,
      completedAt: new Date(),
    },
  })
}

/**
 * Mark a job as failed with an error message.
 */
export async function updateJobError(id: string, error: string): Promise<void> {
  await db.asyncJob.update({
    where: { id },
    data: {
      status: 'failed',
      error,
      completedAt: new Date(),
    },
  })
}

/**
 * Atomically claim the next pending job for processing.
 *
 * Uses a transaction to prevent race conditions when multiple
 * workers try to claim the same job simultaneously.
 *
 * Returns the claimed job row, or null if no pending jobs exist.
 */
export async function claimNextJob(): Promise<AsyncJobRow | null> {
  // Use a transaction to atomically find and claim
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
      select: JOB_SELECT,
    })

    return updated
  })

  return result ? toAsyncJobRow(result) : null
}
