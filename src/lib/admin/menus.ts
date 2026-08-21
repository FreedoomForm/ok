import { z } from 'zod'

export const menuNumberSchema = z.coerce.number().int().min(1).max(21)

const dishIdSchema = z.union([
  z.string().trim().min(1).max(64),
  z.number().int().positive(),
]).transform(String)

export const menuDishMutationSchema = z.object({
  menuNumber: menuNumberSchema,
  dishId: dishIdSchema,
})
