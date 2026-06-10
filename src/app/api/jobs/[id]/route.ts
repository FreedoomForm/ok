/**
 * Job Detail API — GET (status)
 *
 * Requires auth. Only the creator or SUPER_ADMIN can view.
 */

import { createApiRoute, ForbiddenError, NotFoundError } from '@/modules/shared'
import { getJob } from '@/modules/shared/jobs'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user, params }) => {
    const jobId = params?.id
    if (!jobId) {
      throw new NotFoundError('Job')
    }

    const job = await getJob(jobId)
    if (!job) {
      throw new NotFoundError('Job', jobId)
    }

    // Only creator or SUPER_ADMIN can view
    if (job.createdBy !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('You can only view your own jobs')
    }

    return { data: job }
  },
})
