/**
 * List Orders Query — Application layer.
 *
 * Resolves role-based data scoping and delegates to the repository.
 * This is the function that API routes should call.
 */

import { getGroupAdminIds } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import {
  listOrders,
  type ListOrdersInput,
} from '../../infrastructure/order.repository'
import type { OrderListItem, OrderListFilters } from '../../contracts'

export interface ListOrdersQuery {
  user: AuthUser
  date?: string | null
  from?: string | null
  to?: string | null
  filters?: OrderListFilters | null
  includeDeleted?: boolean
  deletedOnly?: boolean
}

/**
 * Resolve scoped admin IDs based on the user's role.
 *
 * - SUPER_ADMIN / COURIER: null (no restriction)
 * - MIDDLE_ADMIN: self + all LOW_ADMINs they created
 * - LOW_ADMIN: owner group (parent middle admin + siblings)
 */
async function resolveScopedAdminIds(
  user: AuthUser,
): Promise<string[] | null> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'COURIER') return null

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
 * Execute the List Orders query.
 *
 * Handles role-based data isolation and courier-specific filtering,
 * then delegates to the repository for data access and transformation.
 */
export async function executeListOrders(
  query: ListOrdersQuery,
): Promise<OrderListItem[]> {
  const scopedAdminIds = await resolveScopedAdminIds(query.user)

  const input: ListOrdersInput = {
    scopedAdminIds,
    date: query.date,
    from: query.from,
    to: query.to,
    filters: query.filters,
    includeDeleted: query.includeDeleted,
    deletedOnly: query.deletedOnly,
    // Couriers only see today's orders assigned to them
    courierFilter:
      query.user.role === 'COURIER'
        ? { courierId: query.user.id }
        : null,
  }

  return listOrders(input)
}
