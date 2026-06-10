/**
 * Get Customer Detail Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  getCustomerDetail,
  type GetCustomerDetailInput,
} from '../../infrastructure/customer.repository'
import type { CustomerDetail } from '../../contracts'
import { NotFoundError } from '@/modules/shared/errors'

export interface GetCustomerDetailQuery {
  user: AuthUser
  customerId: string
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
 * Execute the Get Customer Detail query.
 *
 * Handles role-based data isolation and returns the CustomerDetail DTO.
 * Throws NotFoundError if the customer is not found or not in scope.
 */
export async function executeGetCustomerDetail(
  query: GetCustomerDetailQuery,
): Promise<CustomerDetail> {
  const scopedCreatedBy = await resolveScopedCreatedBy(query.user)

  const input: GetCustomerDetailInput = {
    customerId: query.customerId,
    scopedCreatedBy,
  }

  const result = await getCustomerDetail(input)

  if (!result) {
    throw new NotFoundError('Customer', query.customerId)
  }

  return result
}
