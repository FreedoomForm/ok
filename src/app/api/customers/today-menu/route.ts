import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerAccessFromRequest } from '@/lib/customer-auth'
import { getMenu, getTodaysMenuNumber, getDishImageUrl } from '@/lib/menuData'
import { getOwnerAdminIdForCustomer } from '@/lib/site-access'
import { findCustomerSetDishes } from '@/lib/menu/customer-set'

function normalizeMealType(value?: string) {
  const upper = String(value || 'UNKNOWN').toUpperCase()
  if (upper === 'BREAKFAST' || upper === 'SECOND_BREAKFAST' || upper === 'LUNCH' || upper === 'SNACK' || upper === 'DINNER' || upper === 'SIXTH_MEAL') {
    return upper
  }
  return 'UNKNOWN'
}

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerAccessFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const menuNumber = getTodaysMenuNumber()
    const tier = customer.calories || 0

    const ownerAdminId = await getOwnerAdminIdForCustomer(customer.createdBy)

    let setName: string | null = null
    let source: 'set' | 'default' = 'default'
    let dishes: Array<{ id: number; name: string; mealType: string; imageUrl: string }> = []

    if (ownerAdminId) {
      const activeSet = await db.menuSet.findFirst({
        where: {
          adminId: ownerAdminId,
          isActive: true,
        },
        select: {
          name: true,
          calorieGroups: true,
        },
      })

      if (activeSet) {
        const selectedDishes = findCustomerSetDishes(activeSet.calorieGroups, menuNumber)
        if (selectedDishes.length > 0) {
          const fallbackMenu = getMenu(menuNumber)
          const fallbackById = new Map((fallbackMenu?.dishes || []).map((dish) => [dish.id, dish]))

          dishes = selectedDishes.map((dish) => {
                const fallback = fallbackById.get(dish.dishId)
                return {
                  id: dish.dishId,
                  name: dish.dishName || fallback?.name || `Dish ${dish.dishId}`,
                  mealType: normalizeMealType(dish.mealType || fallback?.mealType),
                  imageUrl: getDishImageUrl(dish.dishId),
                }
          })

          if (dishes.length > 0) {
            source = 'set'
            setName = activeSet.name
          }
        }
      }
    }

    if (dishes.length === 0) {
      const fallbackMenu = getMenu(menuNumber)
      dishes = (fallbackMenu?.dishes || []).map((dish) => ({
        id: dish.id,
        name: dish.name,
        mealType: normalizeMealType(dish.mealType),
        imageUrl: getDishImageUrl(dish.id),
      }))
      source = 'default'
    }

    return NextResponse.json({
      menuNumber,
      tier,
      source,
      setName,
      dishes,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
