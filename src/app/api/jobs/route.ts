/**
 * Jobs API — GET (list) + POST (create)
 *
 * Uses `createApiRoute` + shared jobs module.
 * Requires auth (any admin role).
 */

import { createApiRoute } from '@/modules/shared'
import { z } from 'zod'
import { createJob, listJobs } from '@/modules/shared/jobs'

// ── Schema for creating a job ────────────────────────────────────────────────

const createJobSchema = z.object({
  type: z.string().min(1).max(100),
  input: z.any().optional(),
})

// ── GET /api/jobs — List jobs for current user ──────────────────────────────

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') ?? undefined
    const limit = searchParams.get('limit')
    const type = searchParams.get('type') ?? undefined
    const status = searchParams.get('status') ?? undefined

    // SUPER_ADMIN can see all jobs; others only their own
    const createdBy = user.role === 'SUPER_ADMIN' ? undefined : user.id

    const result = await listJobs({
      filters: { createdBy, type, status },
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    return {
      data: result.items,
      meta: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    }
  },
})

// ── POST /api/jobs — Create a new job ───────────────────────────────────────

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const validated = createJobSchema.parse(body)

    const job = await createJob({
      type: validated.type,
      input: validated.input,
      createdBy: user.id,
    })

    return {
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
      },
      message: 'Job created successfully',
    }
  },
})
