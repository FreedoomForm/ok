import type { Prisma } from '@prisma/client'

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
  if (!isRecord(calorieGroups)) return null
  const dayGroups = calorieGroups[String(menuNumber)]
  if (!Array.isArray(dayGroups)) return null

  for (const groupValue of dayGroups) {
    if (!isRecord(groupValue) || Number(groupValue.calories) !== calorie || !Array.isArray(groupValue.dishes)) continue
    for (const dishValue of groupValue.dishes) {
      if (!isRecord(dishValue) || String(dishValue.dishId) !== dishId) continue
      const customIngredients = parseCookIngredients(dishValue.customIngredients as Prisma.JsonValue)
      return customIngredients.length > 0 ? customIngredients : null
    }
  }

  return null
}
