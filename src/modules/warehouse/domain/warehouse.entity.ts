/**
 * Ingredient Entity — Domain layer.
 *
 * Encapsulates business rules for warehouse ingredient management.
 */

export class IngredientEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly amount: number,
    public readonly unit: string,
    public readonly kcalPerGram: number | null,
    public readonly pricePerUnit: number | null,
  ) {}

  /**
   * Check if there is sufficient stock for a given quantity.
   * Handles unit conversion for common mass/count units.
   */
  hasSufficientStock(quantity: number, unit?: string): boolean {
    const convertedAmount = unit ? convertAmount(quantity, unit, this.unit) : quantity
    if (convertedAmount === null) return false
    return this.amount >= convertedAmount
  }

  /**
   * Calculate the cost for a given quantity.
   */
  calculateCost(quantity: number, unit?: string): number | null {
    if (!this.pricePerUnit) return null
    const convertedAmount = unit ? convertAmount(quantity, unit, this.unit) : quantity
    if (convertedAmount === null) return null
    // Price is per base unit, so cost = quantity_in_base_units * pricePerUnit
    return convertedAmount * this.pricePerUnit
  }
}

/**
 * Dish Entity — Domain layer.
 *
 * Encapsulates business rules for dish cooking operations.
 */
export class DishEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly mealType: string,
    public readonly ingredients: Array<{ name: string; amount: number; unit: string }>,
    public readonly calorieMappings: Record<string, string[]> | null,
  ) {}

  /**
   * Check if the dish can be cooked with the given available ingredients.
   * Returns true if all required ingredients are available in sufficient quantities.
   */
  canBeCooked(availableIngredients: Map<string, IngredientEntity>): { canCook: boolean; shortages: Array<{ name: string; required: number; available: number }> } {
    const shortages: Array<{ name: string; required: number; available: number }> = []

    for (const ingredient of this.ingredients) {
      const available = availableIngredients.get(ingredient.name)
      if (!available) {
        shortages.push({ name: ingredient.name, required: ingredient.amount, available: 0 })
        continue
      }
      if (!available.hasSufficientStock(ingredient.amount, ingredient.unit)) {
        shortages.push({
          name: ingredient.name,
          required: ingredient.amount,
          available: available.amount,
        })
      }
    }

    return { canCook: shortages.length === 0, shortages }
  }

  /**
   * Get the list of required ingredient names.
   */
  requiredIngredientNames(): string[] {
    return this.ingredients.map((i) => i.name)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const massUnits: Record<string, number> = { mg: 0.001, gr: 1, kg: 1000 }
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 }
const countUnits: Record<string, number> = { pcs: 1, dona: 1 }

function convertAmount(amount: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return amount
  if (massUnits[from] && massUnits[to]) return (amount * massUnits[from]) / massUnits[to]
  if (volumeUnits[from] && volumeUnits[to]) return (amount * volumeUnits[from]) / volumeUnits[to]
  if (countUnits[from] && countUnits[to]) return amount
  return null
}

function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase()
  if (value === 'g') return 'gr'
  if (value === 'pc' || value === 'sht' || value === 'don' || value === "bo'lak") return 'pcs'
  return value
}
