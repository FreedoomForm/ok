import { z } from 'zod'

const ingredientRefSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.number().finite().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(32),
})

const calorieMappingsSchema = z.record(
  z.string().regex(/^\d+$/),
  z.array(z.string().trim().min(1).max(32)).max(20),
).refine((mappings) => Object.keys(mappings).every((key) => Number(key) >= 1 && Number(key) <= 21), {
  message: 'Calorie mappings must target menus 1 through 21',
})

const dishFields = {
  name: z.string().trim().min(1, 'Name is required').max(255),
  description: z.string().trim().max(1_000).optional().nullable(),
  mealType: z.string().trim().min(1).max(32),
  ingredients: z.array(ingredientRefSchema).max(200),
  calorieMappings: calorieMappingsSchema.optional().nullable(),
  menuNumbers: z.array(z.number().int().min(1).max(21)).max(21).refine((numbers) => new Set(numbers).size === numbers.length, {
    message: 'Menu numbers must be unique',
  }).optional(),
}

export const createDishSchema = z.object(dishFields)
export const updateDishSchema = z.object({
  id: z.string().trim().min(1),
  ...dishFields,
})
