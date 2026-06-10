/**
 * Shared authentication utilities.
 *
 * Re-exports the existing auth helpers and adds convenience wrappers
 * for the Clean Architecture route handlers.
 */

export { getAuthUser, hasRole, canModifyAdmin, type AuthUser } from '@/lib/auth-utils'
export { ADMIN_ROLES, isAdminRole, ADMIN_ROLE_LEVEL, type AdminRole } from './roles'
export { getOwnerAdminId, getGroupAdminIds, filterCustomerIdsInGroup, isCustomerInGroup, type ScopedUser } from './admin-scope'
