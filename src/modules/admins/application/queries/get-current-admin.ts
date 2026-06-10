/**
 * Get current admin (for /api/admin/me).
 */
import { NotFoundError } from '@/modules/shared/errors'
import { findCurrentAdmin } from '../../infrastructure'
import type { AdminDTO } from '../../contracts'

export type GetCurrentUserQuery = { userId: string }

export async function executeGetCurrentAdmin({ userId }: GetCurrentUserQuery): Promise<AdminDTO> {
  const admin = await findCurrentAdmin(userId)
  if (!admin) {
    throw new NotFoundError('User', userId)
  }
  return admin
}
