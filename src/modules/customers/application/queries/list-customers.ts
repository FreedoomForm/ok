/**
 * List Customers Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 * This is the function that API routes should call.
 */

import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import {
  listCustomers,
  type ListCustomersInput,
} from '../../infrastructure/customer.repository'
import type { CustomerListItem } from '../../contracts'
import type { PaginatedResult } from '@/modules/shared/validation'

export interface ListCustomersQuery {
  user: AuthUser
  deletedOnly?: boolean
  cursor?: string
  limit?: number
}

/**
 * Resolve scoped createdBy IDs based on the user's role.
 *
 * - SUPER_ADMIN: null (no restriction)
 * - MIDDLE_ADMIN: self + all LOW_ADMINs they created
 * - LOW_ADMIN: owner group (parent middle admin + siblings)
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
 * Execute the List Customers query.
 *
 * Handles role-based data isolation and delegates to the repository
 * for data access and transformation.
 */
export async function executeListCustomers(
  query: ListCustomersQuery,
): Promise<PaginatedResult<CustomerListItem>> {
  const scopedCreatedBy = await resolveScopedCreatedBy(query.user)

  const input: ListCustomersInput = {
    scopedCreatedBy,
    deletedOnly: query.deletedOnly,
    cursor: query.cursor,
    limit: query.limit,
  }

  return listCustomers(input)
}
