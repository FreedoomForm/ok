import { z } from 'zod'

const cookUpdateSchema = z.object({
  dishId: z.union([z.string().trim().min(1).max(64), z.number().int().nonnegative()]).transform(String),
  calorie: z.coerce.number().int().min(0).max(10_000),
  amount: z.coerce.number().int().min(1).max(100_000),
})

export const cookRequestSchema = z.object({
  date: z.coerce.date(),
  menuNumber: z.coerce.number().int().min(1).max(21).optional(),
  updates: z.array(cookUpdateSchema).min(1).max(500),
  activeSetId: z.string().trim().min(1).max(128).optional().nullable(),
})

export type CookRequest = z.infer<typeof cookRequestSchema>
