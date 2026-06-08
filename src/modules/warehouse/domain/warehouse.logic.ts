// Pure domain logic extracted from menuData.ts for ingredient calculations.
// No framework imports. No Prisma. Just math.

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface DishInput {
  id: number;
  ingredients: Ingredient[];
}

export interface CalorieGroup {
  calories: number;
  dishes: { dishId: number; customIngredients?: Ingredient[] }[];
}

export function calculateIngredientsForMenu(
  menuDishes: DishInput[],
  clientsByCalorie: Record<number, number>,
  dishQuantities?: Record<number, number>,
  customGroups?: CalorieGroup[],
): Map<string, { amount: number; unit: string }> {
  const totalIngredients = new Map<string, { amount: number; unit: string }>();
  const clientTierKeys = Object.keys(clientsByCalorie)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n));

  const getClientCountForGroupCalories = (groupCalories: number): number => {
    if (clientTierKeys.length === 0) return 0;
    const exact = clientsByCalorie[groupCalories];
    if (typeof exact === 'number') return exact;
    let closest = clientTierKeys[0];
    for (const tier of clientTierKeys) {
      if (Math.abs(tier - groupCalories) < Math.abs((closest as number) - groupCalories)) {
        closest = tier;
      }
    }
    return clientsByCalorie[closest] || 0;
  };

  const totalClients = Object.values(clientsByCalorie).reduce((sum, c) => sum + c, 0);
  if (totalClients === 0) return totalIngredients;

  if (customGroups && customGroups.length > 0) {
    for (const group of customGroups) {
      const calories = Number.isFinite(group.calories) ? group.calories : 0;
      const clientCount = getClientCountForGroupCalories(calories);
      if (clientCount === 0) continue;

      for (const setDish of group.dishes) {
        const dishQty = dishQuantities?.[setDish.dishId] ?? totalClients;
        if (dishQty === 0) continue;
        const portionsForTier = (dishQty / totalClients) * clientCount;

        let ingredientsToUse = setDish.customIngredients;
        if (!ingredientsToUse) {
          const dish = menuDishes.find((d) => d.id === setDish.dishId);
          ingredientsToUse = dish?.ingredients;
        }

        if (ingredientsToUse) {
          for (const ing of ingredientsToUse) {
            const scaledAmount = (Number(ing.amount) || 0) * portionsForTier;
            const existing = totalIngredients.get(ing.name);
            if (existing) {
              existing.amount = Math.round((existing.amount + scaledAmount) * 10) / 10;
            } else {
              totalIngredients.set(ing.name, {
                amount: Math.round(scaledAmount * 10) / 10,
                unit: ing.unit,
              });
            }
          }
        }
      }
    }
    return totalIngredients;
  }

  // Standard menu logic
  for (const dish of menuDishes) {
    const dishQty = dishQuantities?.[dish.id] ?? totalClients;
    if (dishQty === 0) continue;

    for (const ing of dish.ingredients) {
      const scaledAmount = (Number(ing.amount) || 0) * dishQty;
      const existing = totalIngredients.get(ing.name);
      if (existing) {
        existing.amount = Math.round((existing.amount + scaledAmount) * 10) / 10;
      } else {
        totalIngredients.set(ing.name, { amount: Math.round(scaledAmount * 10) / 10, unit: ing.unit });
      }
    }
  }

  return totalIngredients;
}

export function calculateShoppingList(
  expectedIngredients: Map<string, { amount: number; unit: string }>,
  remainingInventory: Record<string, number>,
): Map<string, { amount: number; unit: string }> {
  const shoppingList = new Map<string, { amount: number; unit: string }>();

  for (const [name, { amount, unit }] of expectedIngredients) {
    const remaining = remainingInventory[name] || 0;
    const needed = amount - remaining;
    if (needed > 0) {
      shoppingList.set(name, { amount: Math.round(needed * 10) / 10, unit });
    }
  }

  return shoppingList;
}

export function convertToUnit(amount: number, fromUnit: string, toUnit: string): number | null {
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (toUnit || '').toLowerCase().trim();
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const mass: Record<string, number> = { kg: 1000, g: 1, gr: 1, mg: 0.001 };
  const volume: Record<string, number> = { l: 1000, ml: 1, litr: 1000 };
  const pcs: Record<string, number> = { pcs: 1, pc: 1, sht: 1, dona: 1, шт: 1, дона: 1 };

  if (mass[from] && mass[to]) return (amount * mass[from]) / mass[to];
  if (volume[from] && volume[to]) return (amount * volume[from]) / volume[to];
  if (pcs[from] && pcs[to]) return amount;
  return null;
}
