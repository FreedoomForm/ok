/**
 * List users for action-logs filter (for /api/admin/users-list).
 */
import { listUsersForLogs } from '../../infrastructure'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { UsersListItem } from '../../contracts'
import type { AuthUser } from '@/modules/shared/auth'

export type ListUsersQuery = { user: AuthUser }

export async function executeListUsers({ user }: ListUsersQuery): Promise<{ users: UsersListItem[] }> {
  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
  const users = await listUsersForLogs(user, groupAdminIds)
  return { users }
}
