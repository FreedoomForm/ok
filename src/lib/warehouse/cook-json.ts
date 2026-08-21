import type { Prisma } from '@prisma/client'
import { getSetDayGroups } from '@/lib/menu/set-groups'

export type CookIngredient = {
  name: string
  amount: number
  unit: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCookIngredients(value: Prisma.JsonValue): CookIngredient[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((ingredient) => {
    if (!isRecord(ingredient) || typeof ingredient.name !== 'string' || typeof ingredient.unit !== 'string') {
      return []
    }
    const amount = Number(ingredient.amount)
    return Number.isFinite(amount) && amount >= 0
      ? [{ name: ingredient.name, amount, unit: ingredient.unit }]
      : []
  })
}

export function findCustomCookIngredients(
  calorieGroups: Prisma.JsonValue,
  menuNumber: number,
  calorie: number,
  dishId: string,
): CookIngredient[] | null {
  const dayGroups = getSetDayGroups(calorieGroups, menuNumber)
  for (const group of dayGroups) {
    if (group.calories !== calorie) continue
    for (const dish of group.dishes ?? []) {
      if (String(dish.dishId) !== dishId) continue
      const customIngredients = parseCookIngredients(dish.customIngredients as Prisma.JsonValue)
      return customIngredients.length > 0 ? customIngredients : null
    }
  }

  return null
}
