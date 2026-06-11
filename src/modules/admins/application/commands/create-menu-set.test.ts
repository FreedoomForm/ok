import { describe, it, expect } from 'vitest'
import { buildInitialCalorieGroups } from './create-menu-set'

describe('buildInitialCalorieGroups', () => {
  it('returns an object keyed by menu number', () => {
    const groups = buildInitialCalorieGroups()
    expect(groups).toBeTypeOf('object')
    expect(groups).not.toBeNull()
    // Keys must be stringified menu numbers.
    for (const key of Object.keys(groups)) {
      expect(key).toMatch(/^\d+$/)
    }
  })

  it('produces a single seed group with the expected shape per menu', () => {
    const groups = buildInitialCalorieGroups()
    const keys = Object.keys(groups)
    // The standard MENUS data should yield at least one populated menu.
    expect(keys.length).toBeGreaterThan(0)

    const firstGroup = groups[keys[0]] as unknown as Array<Record<string, unknown>>
    expect(Array.isArray(firstGroup)).toBe(true)
    expect(firstGroup[0]).toMatchObject({
      id: 'group-1',
      name: '1',
      calories: 0,
    })
    expect(Array.isArray(firstGroup[0].dishes)).toBe(true)
  })

  it('only includes dishes with dishId, dishName and mealType keys', () => {
    const groups = buildInitialCalorieGroups()
    const keys = Object.keys(groups)
    const firstGroup = groups[keys[0]] as unknown as Array<{
      dishes: Array<Record<string, unknown>>
    }>
    const sampleDish = firstGroup[0].dishes[0]
    expect(sampleDish).toHaveProperty('dishId')
    expect(sampleDish).toHaveProperty('dishName')
    expect(sampleDish).toHaveProperty('mealType')
  })
})
