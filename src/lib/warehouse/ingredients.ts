import { z } from 'zod'

const ingredientName = z.string().trim().min(1).max(120)
const amount = z.number().finite().min(0).max(1_000_000)
const unit = z.string().trim().min(1).max(32)
const kcalPerGram = z.number().finite().min(0).max(10_000).nullable().optional()
const pricePerUnit = z.number().finite().min(0).max(1_000_000_000).nullable().optional()
const priceUnit = z.string().trim().min(1).max(32)

export const createIngredientSchema = z.object({
  name: ingredientName,
  amount: amount.default(0),
  unit: unit.default('gr'),
  kcalPerGram,
  pricePerUnit,
  priceUnit: priceUnit.default('kg'),
})

export const updateIngredientSchema = z.object({
  id: z.string().trim().min(1),
  name: ingredientName,
  amount,
  unit,
  kcalPerGram,
  pricePerUnit,
  priceUnit,
})

export const ingredientLifecycleSchema = z.object({
  id: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  deletedAt: z.boolean().optional(),
}).strict().refine((value) => value.isActive !== undefined || value.deletedAt !== undefined, {
  message: 'Lifecycle update must change isActive or deletedAt',
})
