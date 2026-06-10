/**
 * Batch Get Customers Query — Application layer.
 *
 * Validates input (max 100 IDs), resolves role-based data scoping,
 * and delegates to the repository for batch fetching.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { BatchGetInput, BatchGetResult } from '@/modules/shared/contracts'
import {
  batchGetCustomers,
  type BatchGetCustomersInput,
} from '../../infrastructure/customer.repository'
import type { CustomerListItem } from '../../contracts'
import { ValidationFailedError } from '@/modules/shared/errors'

export interface BatchGetCustomersQuery {
  input: BatchGetInput
  user: AuthUser
}

/**
 * Resolve scoped createdBy IDs based on the user's role.
 */
async function resolveScopedCreatedBy(
  user: AuthUser,
): Promise<string[] | null> {
  if (user.role === 'SUPER_ADMIN') return null

  if (user.role === 'MIDDLE_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    return groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
  }

  if (user.role === 'LOW_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    return groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id]
  }

  return [user.id]
}

/**
 * Execute the Batch Get Customers query.
 *
 * Validates input (max 100 IDs), applies role-based scoping,
 * and returns found items + not-found IDs.
 */
export async function executeBatchGetCustomers(
  query: BatchGetCustomersQuery,
): Promise<BatchGetResult<CustomerListItem>> {
  const { input, user } = query

  // Validate max 100 IDs
  if (input.ids.length > 100) {
    throw new ValidationFailedError('Maximum 100 IDs allowed per batch request', {
      fields: { ids: [`Received ${input.ids.length} IDs, maximum is 100`] },
    })
  }

  const scopedCreatedBy = await resolveScopedCreatedBy(user)

  const repoInput: BatchGetCustomersInput = {
    ids: input.ids,
    scopedCreatedBy,
  }

  return batchGetCustomers(repoInput)
}
