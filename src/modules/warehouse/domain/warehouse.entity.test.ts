import { describe, it, expect } from 'vitest'
import { IngredientEntity, DishEntity } from './warehouse.entity'

// ── IngredientEntity ─────────────────────────────────────────────────────────

describe('IngredientEntity.hasSufficientStock', () => {
  it('returns true when stock is sufficient', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    expect(ingredient.hasSufficientStock(500)).toBe(true)
  })

  it('returns true when stock exactly equals quantity', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    expect(ingredient.hasSufficientStock(1000)).toBe(true)
  })

  it('returns false when stock is insufficient', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 500, 'gr', 2.5, 50)
    expect(ingredient.hasSufficientStock(1000)).toBe(false)
  })

  it('returns false when stock is zero', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 0, 'gr', 2.5, 50)
    expect(ingredient.hasSufficientStock(1)).toBe(false)
  })

  it('handles unit conversion (kg → gr)', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    // 1 kg = 1000 gr
    expect(ingredient.hasSufficientStock(1, 'kg')).toBe(true)
    expect(ingredient.hasSufficientStock(2, 'kg')).toBe(false)
  })

  it('handles unit conversion (gr → kg)', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 2, 'kg', 2.5, 50)
    // 500 gr should be < 2 kg
    expect(ingredient.hasSufficientStock(500, 'gr')).toBe(true)
    // 3000 gr should be > 2 kg
    expect(ingredient.hasSufficientStock(3000, 'gr')).toBe(false)
  })

  it('returns false for incompatible unit conversion', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    expect(ingredient.hasSufficientStock(1, 'ml')).toBe(false)
  })
})

describe('IngredientEntity.calculateCost', () => {
  it('calculates cost for same unit', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    expect(ingredient.calculateCost(500)).toBe(25000)
  })

  it('calculates cost with unit conversion', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    // 1 kg = 1000 gr → 1000 * 50 = 50000
    expect(ingredient.calculateCost(1, 'kg')).toBe(50000)
  })

  it('returns null when pricePerUnit is null', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, null)
    expect(ingredient.calculateCost(500)).toBeNull()
  })

  it('returns null for incompatible unit conversion', () => {
    const ingredient = new IngredientEntity('ing-1', 'Beef', 1000, 'gr', 2.5, 50)
    expect(ingredient.calculateCost(1, 'ml')).toBeNull()
  })
})

// ── DishEntity ───────────────────────────────────────────────────────────────

describe('DishEntity.canBeCooked', () => {
  it('returns canCook=true when all ingredients are available', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
      { name: 'Beef', amount: 300, unit: 'gr' },
    ], null)

    const available = new Map<string, IngredientEntity>([
      ['Rice', new IngredientEntity('ing-1', 'Rice', 1000, 'gr', 3.5, 20)],
      ['Beef', new IngredientEntity('ing-2', 'Beef', 1000, 'gr', 2.5, 50)],
    ])

    const result = dish.canBeCooked(available)
    expect(result.canCook).toBe(true)
    expect(result.shortages).toHaveLength(0)
  })

  it('returns canCook=false when an ingredient is missing', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
      { name: 'Beef', amount: 300, unit: 'gr' },
    ], null)

    const available = new Map<string, IngredientEntity>([
      ['Rice', new IngredientEntity('ing-1', 'Rice', 1000, 'gr', 3.5, 20)],
      // Beef is missing
    ])

    const result = dish.canBeCooked(available)
    expect(result.canCook).toBe(false)
    expect(result.shortages).toHaveLength(1)
    expect(result.shortages[0].name).toBe('Beef')
    expect(result.shortages[0].available).toBe(0)
  })

  it('returns canCook=false when an ingredient has insufficient stock', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
      { name: 'Beef', amount: 300, unit: 'gr' },
    ], null)

    const available = new Map<string, IngredientEntity>([
      ['Rice', new IngredientEntity('ing-1', 'Rice', 1000, 'gr', 3.5, 20)],
      ['Beef', new IngredientEntity('ing-2', 'Beef', 100, 'gr', 2.5, 50)],
    ])

    const result = dish.canBeCooked(available)
    expect(result.canCook).toBe(false)
    expect(result.shortages).toHaveLength(1)
    expect(result.shortages[0].name).toBe('Beef')
  })

  it('returns shortages with correct available amounts', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
    ], null)

    const available = new Map<string, IngredientEntity>([
      ['Rice', new IngredientEntity('ing-1', 'Rice', 200, 'gr', 3.5, 20)],
    ])

    const result = dish.canBeCooked(available)
    expect(result.canCook).toBe(false)
    expect(result.shortages[0].required).toBe(500)
    expect(result.shortages[0].available).toBe(200)
  })

  it('handles multiple missing ingredients', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
      { name: 'Beef', amount: 300, unit: 'gr' },
      { name: 'Carrot', amount: 200, unit: 'gr' },
    ], null)

    const available = new Map<string, IngredientEntity>()

    const result = dish.canBeCooked(available)
    expect(result.canCook).toBe(false)
    expect(result.shortages).toHaveLength(3)
  })
})

describe('DishEntity.requiredIngredientNames', () => {
  it('returns list of ingredient names', () => {
    const dish = new DishEntity('dish-1', 'Plov', 'LUNCH', [
      { name: 'Rice', amount: 500, unit: 'gr' },
      { name: 'Beef', amount: 300, unit: 'gr' },
    ], null)

    expect(dish.requiredIngredientNames()).toEqual(['Rice', 'Beef'])
  })
})
