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

export const cookingPlanWriteSchema = z.object({
  date: cookingPlanDate,
  menuNumber: z.coerce.number().int().min(1).max(21),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  dishes: cookingPlanDishes,
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
