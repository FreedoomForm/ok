import { z } from 'zod'

const cookingIngredientSchema = z.object({
  name: z.string().trim().min(1).max(128),
  amount: z.coerce.number().finite().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(32),
}).strict()

const cookingProvenanceSchema = z.object({
  clientIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
  contractIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
  orderIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
  setId: z.string().trim().min(1).max(128).optional().nullable(),
  groupCalories: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
}).strict()

const cookUpdateSchema = z.object({
  dishId: z.union([z.string().trim().min(1).max(64), z.number().int().nonnegative()]).transform(String),
  calorie: z.coerce.number().int().min(0).max(10_000),
  amount: z.coerce.number().int().min(1).max(100_000),
  actualIngredients: z.array(cookingIngredientSchema).max(100).optional(),
  provenance: cookingProvenanceSchema.optional(),
}).strict()

export const cookRequestSchema = z.object({
  date: z.coerce.date(),
  menuNumber: z.coerce.number().int().min(1).max(21).optional(),
  updates: z.array(cookUpdateSchema).min(1).max(500),
  activeSetId: z.string().trim().min(1).max(128).optional().nullable(),
})

export type CookRequest = z.infer<typeof cookRequestSchema>
