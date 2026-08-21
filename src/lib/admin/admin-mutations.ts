import { z } from 'zod'

export const adminTargetIdSchema = z.string().trim().min(1).max(128)

export function canDeactivateAdmin(currentUserId: string, targetAdminId: string, isActive: boolean) {
  return isActive || currentUserId !== targetAdminId
}
