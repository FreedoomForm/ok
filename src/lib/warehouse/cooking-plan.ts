import { z } from 'zod'

export const MAX_COOKING_PLAN_RANGE_DAYS = 31

const cookingPlanDate = z.coerce.date()
const cookingPlanDishes = z.record(
  z.string().trim().min(1).max(64),
  z.number().finite().min(0).max(100_000),
).superRefine((dishes, context) => {
  if (Object.keys(dishes).length > 500) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cooking plan contains too many dishes' })
  }
})

const cookingConsumptionSchema = z.object({
  dishId: z.string().trim().min(1).max(64),
  calorie: z.coerce.number().int().min(0).max(10_000),
  amount: z.coerce.number().int().min(1).max(100_000),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(128),
    amount: z.number().finite().min(0).max(1_000_000),
    unit: z.string().trim().min(1).max(32),
  }).strict()).max(100),
  provenance: z.object({
    clientIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
    contractIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
    orderIds: z.array(z.string().trim().min(1).max(128)).max(200).optional(),
    setId: z.string().trim().min(1).max(128).optional().nullable(),
    groupCalories: z.number().int().min(0).max(10_000).optional().nullable(),
  }).strict().optional(),
}).strict()

export const cookingPlanWriteSchema = z.object({
  date: cookingPlanDate,
  menuNumber: z.coerce.number().int().min(1).max(21),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  dishes: cookingPlanDishes,
  consumption: z.array(cookingConsumptionSchema).max(500).optional(),
})

export function toLocalDayBounds(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return null

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function validateCookingPlanRange(start: Date, end: Date): string | null {
  if (start > end) return 'Date range is reversed'
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
  if (rangeDays > MAX_COOKING_PLAN_RANGE_DAYS) return `Date range cannot exceed ${MAX_COOKING_PLAN_RANGE_DAYS} days`
  return null
}
