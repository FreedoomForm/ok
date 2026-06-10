/**
 * Shared authentication utilities.
 *
 * Re-exports the existing auth helpers and adds convenience wrappers
 * for the Clean Architecture route handlers.
 */

export { getAuthUser, hasRole, canModifyAdmin, type AuthUser } from '@/lib/auth-utils'
