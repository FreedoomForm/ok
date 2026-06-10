/**
 * Batch Get Admins Query — Application layer.
 *
 * Validates input (max 100 IDs), applies role-based scoping,
 * and delegates to the repository for batch fetching.
 */

import type { AuthUser } from '@/modules/shared/auth'
import type { BatchGetInput, BatchGetResult } from '@/modules/shared/contracts'
import { batchGetAdmins } from '../../infrastructure/admins.repository'
import type { AdminListItem } from '../../contracts'
import { ForbiddenError, ValidationFailedError } from '@/modules/shared/errors'

export interface BatchGetAdminsQuery {
  input: BatchGetInput
  user: AuthUser
}

/**
 * Execute the Batch Get Admins query.
 *
 * Validates input (max 100 IDs), applies role-based scoping,
 * and returns found items + not-found IDs.
 *
 * Only SUPER_ADMIN and MIDDLE_ADMIN can batch-fetch admins.
 */
export async function executeBatchGetAdmins(
  query: BatchGetAdminsQuery,
): Promise<BatchGetResult<AdminListItem>> {
  const { input, user } = query

  // Role check
  if (!['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only SUPER_ADMIN and MIDDLE_ADMIN can batch-fetch admins')
  }

  // Validate max 100 IDs
  if (input.ids.length > 100) {
    throw new ValidationFailedError('Maximum 100 IDs allowed per batch request', {
      fields: { ids: [`Received ${input.ids.length} IDs, maximum is 100`] },
    })
  }

  // For now, any SUPER_ADMIN or MIDDLE_ADMIN can batch-get admins.
  // Further scoping (e.g., MIDDLE_ADMIN can only see their subordinates)
  // can be added later by filtering results.
  return batchGetAdmins(input.ids)
}
