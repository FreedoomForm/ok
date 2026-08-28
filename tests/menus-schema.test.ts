import assert from 'node:assert/strict'
import test from 'node:test'
import { menuDishMutationSchema, menuNumberSchema } from '../src/lib/admin/menus'
import { calculateIngredientsForMenu, getMenu } from '../src/lib/menuData'
import { calculatePeriodIngredients } from '../src/lib/warehouse/period-demand'

test('accepts and normalizes valid menu identifiers', () => {
  assert.equal(menuNumberSchema.safeParse('21').success, true)
  assert.deepEqual(menuDishMutationSchema.parse({ menuNumber: '7', dishId: 42 }), {
    menuNumber: 7,
    dishId: '42',
  })
})

test('distributes one manual dish quantity across assigned calorie groups without double-counting', () => {
  const ingredients = calculateIngredientsForMenu(
    1,
    { 1200: 1, 2000: 1 },
    { 1: 2 },
    { calorieGroups: [{ calories: 1200, dishes: [{ dishId: 1, customIngredients: [{ name: 'Shared ingredient', amount: 10, unit: 'g' }] }] }, { calories: 2000, dishes: [{ dishId: 1, customIngredients: [{ name: 'Shared ingredient', amount: 10, unit: 'g' }] }] }] },
  )
  assert.deepEqual(ingredients.get('Shared ingredient'), { amount: 20, unit: 'g' })
})

test('range calculator aggregates effective daily demand without reusing one-day overrides', () => {
  const result = calculatePeriodIngredients(['day-1', 'day-2'], (date, allowManualOverrides) => {
    const amount = allowManualOverrides ? 100 : date === 'day-1' ? 10 : 20
    return new Map([['Rice', { amount, unit: 'g' }]])
  })
  assert.deepEqual(result.get('Rice'), { amount: 30, unit: 'g' })
})

test('rejects invalid menu numbers and dish identifiers', () => {
  assert.equal(menuNumberSchema.safeParse('0').success, false)
  assert.equal(menuNumberSchema.safeParse('22').success, false)
  assert.equal(menuNumberSchema.safeParse('7.5').success, false)
  assert.equal(menuDishMutationSchema.safeParse({ menuNumber: 7, dishId: '' }).success, false)
  assert.equal(menuDishMutationSchema.safeParse({ menuNumber: 7, dishId: 0 }).success, false)
})

test('calculator excludes disabled dishes and ingredients from effective demand', () => {
  const baseline = calculateIngredientsForMenu(1, { 1200: 1 })
  const ingredientName = baseline.keys().next().value
  assert.equal(typeof ingredientName, 'string')
  const filtered = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, null, {
    disabledIngredientNames: new Set([ingredientName as string]),
  })
  assert.equal(filtered.has(ingredientName as string), false)
  assert.ok(filtered.size < baseline.size)
})

test('calculator excludes ingredients disabled on the selected date', () => {
  const baseline = calculateIngredientsForMenu(1, { 1200: 1 })
  const ingredientName = baseline.keys().next().value
  assert.equal(typeof ingredientName, 'string')
  const date = '2026-09-01'
  const filtered = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, null, {
    date,
    disabledIngredientDates: new Set([`${ingredientName as string}:${date}`]),
  })
  assert.equal(filtered.has(ingredientName as string), false)
})

test('calculator excludes dishes disabled on the selected date', () => {
  const date = '2026-09-01'
  const menu = getMenu(1)
  assert.ok(menu)
  const baseline = calculateIngredientsForMenu(1, { 1200: 1 })
  assert.ok(baseline.size > 0)
  const filtered = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, null, {
    date,
    disabledDishDates: new Set(menu.dishes.map((dish) => `${dish.id}:${date}`)),
  })
  assert.equal(filtered.size, 0)
})

test('calculator excludes disabled JSON set and group dates', () => {
  const activeSet = {
    id: 'set-cuid',
    calorieGroups: {
      '1': [{ id: 'group-cuid', calories: 1200, dishes: [{ dishId: 'dish-cuid', customIngredients: [{ name: 'Group rice', amount: 100, unit: 'g' }] }] }],
    },
  }
  const date = '2026-09-01'
  const baseline = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, activeSet)
  assert.deepEqual(baseline.get('Group rice'), { amount: 100, unit: 'g' })
  const disabledSet = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, activeSet, { date, disabledSetDates: new Set([`set-cuid:${date}`]) })
  assert.equal(disabledSet.size, 0)
  const disabledGroup = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, activeSet, { date, disabledGroupDates: new Set([`set-cuid:group-cuid:${date}`]) })
  assert.equal(disabledGroup.size, 0)
})

test('calculator excludes string-backed database dishes disabled for the selected day', () => {
  const activeSet = {
    calorieGroups: {
      '1': [{ calories: 1200, dishes: [{ dishId: 'dish-cuid', customIngredients: [{ name: 'Database rice', amount: 100, unit: 'g' }] }] }],
    },
  }
  const baseline = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, activeSet)
  assert.deepEqual(baseline.get('Database rice'), { amount: 100, unit: 'g' })
  const filtered = calculateIngredientsForMenu(1, { 1200: 1 }, undefined, activeSet, {
    disabledDishIds: new Set(['dish-cuid'] as never),
  })
  assert.equal(filtered.has('Database rice'), false)
})
