import type { Prisma } from '@prisma/client'

export type CustomerSetDish = {
  dishId: number
  dishName?: string
  mealType?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function findCustomerSetDishes(
  calorieGroups: Prisma.JsonValue,
  menuNumber: number,
): CustomerSetDish[] {
  if (!isRecord(calorieGroups)) return []
  const dayGroups = calorieGroups[String(menuNumber)]
  if (!Array.isArray(dayGroups)) return []

  for (const group of dayGroups) {
    if (!isRecord(group) || !Array.isArray(group.dishes) || group.dishes.length === 0) continue
    const dishes = group.dishes.flatMap((dish) => {
      if (!isRecord(dish) || typeof dish.dishId !== 'number' || !Number.isInteger(dish.dishId)) return []
      return [{
        dishId: dish.dishId,
        ...(typeof dish.dishName === 'string' ? { dishName: dish.dishName } : {}),
        ...(typeof dish.mealType === 'string' ? { mealType: dish.mealType } : {}),
      }]
    })
    if (dishes.length > 0) return dishes
  }

  return []
}
