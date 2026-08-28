import { z } from 'zod'

const adminLifecyclePayload = z.object({
  id: z.string().trim().min(1).max(128),
  deletedAt: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => value.deletedAt !== undefined || value.isActive !== undefined, {
  message: 'An explicit lifecycle state is required',
})

export const adminLifecycleSchema = adminLifecyclePayload
export type AdminLifecycleInput = z.infer<typeof adminLifecyclePayload>

type LifecycleActor = { id: string; role: string }
type LifecycleTarget = { id: string; role: string; createdBy: string | null }

export function canManageAdminLifecycle(actor: LifecycleActor, target: LifecycleTarget): boolean {
  if (actor.id === target.id) return false
  if (actor.role === 'SUPER_ADMIN') return true
  return actor.role === 'MIDDLE_ADMIN' && ['LOW_ADMIN', 'COURIER', 'WORKER'].includes(target.role) && target.createdBy === actor.id
}

export function buildAdminLifecycleData(input: boolean | Pick<AdminLifecycleInput, 'deletedAt' | 'isActive'>) {
  if (typeof input === 'boolean') return { deletedAt: input ? new Date() : null, isActive: !input }
  if (input.deletedAt !== undefined) return { deletedAt: input.deletedAt ? new Date() : null, isActive: !input.deletedAt }
  return { isActive: input.isActive as boolean }
}
