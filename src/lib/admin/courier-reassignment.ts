import { z } from 'zod'

const assignmentSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  targetCourierId: z.string().trim().min(1).max(128),
}).strict()

export const courierReassignmentSchema = z.object({
  courierId: z.string().trim().min(1).max(128),
  assignments: z.array(assignmentSchema).min(1).max(500),
}).strict().superRefine((payload, context) => {
  const orderIds = new Set<string>()
  for (const [index, assignment] of payload.assignments.entries()) {
    if (assignment.targetCourierId === payload.courierId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', index, 'targetCourierId'], message: 'Assignment target must differ from source courier' })
    }
    if (orderIds.has(assignment.orderId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', index, 'orderId'], message: 'Each order may be assigned once' })
    }
    orderIds.add(assignment.orderId)
  }
})

export type CourierReassignment = z.infer<typeof courierReassignmentSchema>

export function getReassignmentOrderIds(payload: CourierReassignment): string[] {
  return payload.assignments.map((assignment) => assignment.orderId)
}
