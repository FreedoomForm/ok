import { z } from 'zod'

export const purchaseRequestSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    amount: z.number().finite().positive().max(1_000_000),
    costPerUnit: z.number().finite().nonnegative().max(1_000_000_000),
    unit: z.string().trim().min(1).max(32).default('kg'),
    kcalPerGram: z.number().finite().nonnegative().max(10_000).optional(),
  })).min(1).max(200),
})
