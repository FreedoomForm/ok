import { z } from 'zod'

export const transactionRequestSchema = z.object({
  customerId: z.string().trim().min(1).max(128).optional(),
  amount: z.number().finite().positive().max(1_000_000_000_000),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().max(1_000).optional(),
  category: z.string().trim().min(1).max(64).optional(),
  virtualCardId: z.string().trim().min(1).max(128).optional(),
}).superRefine((value, context) => {
  if (value.customerId && value.virtualCardId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['virtualCardId'], message: 'Customer and virtual card cannot be combined' })
  }
})
