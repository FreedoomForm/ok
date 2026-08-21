import type { Prisma } from '@prisma/client'
import { getSetDayDishes } from '@/lib/menu/set-groups'

export type CustomerSetDish = {
  dishId: number
  dishName?: string
  mealType?: string
}

export function findCustomerSetDishes(
  calorieGroups: Prisma.JsonValue,
  menuNumber: number,
): CustomerSetDish[] {
  return getSetDayDishes(calorieGroups, menuNumber).flatMap((dish) => {
    if (typeof dish.dishId !== 'number' || !Number.isInteger(dish.dishId)) return []
    return [{
      dishId: dish.dishId,
      ...(dish.dishName ? { dishName: dish.dishName } : {}),
      ...(dish.mealType ? { mealType: dish.mealType } : {}),
    }]
  })
}
