import { z } from 'zod'

export const adminTargetIdSchema = z.string().trim().min(1).max(128)

export const adminStatusMutationSchema = z.object({
  isActive: z.boolean(),
}).strict()

export const safeAdminSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const

export function canDeactivateAdmin(currentUserId: string, targetAdminId: string, isActive: boolean) {
  return isActive || currentUserId !== targetAdminId
}
