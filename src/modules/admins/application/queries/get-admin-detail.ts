/**
 * Get admin detail by ID.
 */
import { NotFoundError } from '@/modules/shared/errors'
import { findAdminDetail } from '../../infrastructure'
import type { AdminDetail } from '../../contracts'

export type GetAdminDetailQuery = { adminId: string }

export async function executeGetAdminDetail({ adminId }: GetAdminDetailQuery): Promise<AdminDetail> {
  const admin = await findAdminDetail(adminId)
  if (!admin) {
    throw new NotFoundError('Admin', adminId)
  }
  return admin
}
