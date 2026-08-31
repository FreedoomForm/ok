import assert from 'node:assert/strict'
import test from 'node:test'
import { filterEffectiveRouteStops } from '../src/lib/routes/availability'

test('route stop filtering excludes only disabled client delivery days', () => {
  const stops = [
    { id: 'disabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
    { id: 'enabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-26T10:00:00.000Z') } },
    { id: 'missing-date', order: { customerId: 'client-2', deliveryDate: null } },
  ]
  const result = filterEffectiveRouteStops(stops, new Map([['client-1', new Set(['2026-08-25'])]]))
  assert.deepEqual(result.map((stop) => stop.id), ['enabled', 'missing-date'])
  assert.equal(stops.length, 3)
})

test('route stop filtering excludes stops outside effective client contract periods', () => {
  const stops = [
    { id: 'period-active', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-24T10:00:00.000Z'), contractPeriods: [{ customerId: 'client-1', startDate: '2026-08-24', endDate: '2026-08-28', isActive: true, enabledWeekdays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] }] } },
    { id: 'period-weekday-disabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-25T10:00:00.000Z'), contractPeriods: [{ customerId: 'client-1', startDate: '2026-08-24', endDate: '2026-08-28', isActive: true, enabledWeekdays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] }] } },
    { id: 'period-date-disabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-26T10:00:00.000Z'), contractPeriods: [{ customerId: 'client-1', startDate: '2026-08-24', endDate: '2026-08-28', isActive: true, enabledWeekdays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], disabledDates: ['2026-08-26'] }] } },
  ]
  const result = filterEffectiveRouteStops(stops, new Map())
  assert.deepEqual(result.map((stop) => stop.id), ['period-active'])
})

test('route stop filtering excludes route-stop-disabled dates without mutating history', () => {
  const stops = [
    { id: 'stop-disabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
    { id: 'stop-enabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
  ]
  const result = filterEffectiveRouteStops(stops, new Map(), new Set(), new Map([['stop-1', new Set(['2026-08-25'])], ['stop-disabled', new Set(['2026-08-25'])]]))
  assert.deepEqual(result.map((stop) => stop.id), ['stop-enabled'])
  assert.equal(stops.length, 2)
})

test('route stop filtering excludes route-disabled dates without mutating history', () => {
  const stops = [
    { id: 'route-disabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
    { id: 'route-enabled', order: { customerId: 'client-1', deliveryDate: new Date('2026-08-26T10:00:00.000Z') } },
  ]
  const result = filterEffectiveRouteStops(stops, new Map(), new Set(['2026-08-25']))
  assert.deepEqual(result.map((stop) => stop.id), ['route-enabled'])
  assert.equal(stops.length, 2)
})

test('route stop filtering honors availability-graph contract overrides (§16)', () => {
  const stops = [
    { id: 'contract-overridden', order: { customerId: 'solo', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
    { id: 'other-day', order: { customerId: 'solo', deliveryDate: new Date('2026-08-26T10:00:00.000Z') } },
    { id: 'partial-demand', order: { customerId: 'dual', deliveryDate: new Date('2026-08-25T10:00:00.000Z') } },
    { id: 'undated', order: { customerId: 'solo', deliveryDate: null } },
  ]
  const contractOverriddenDates = new Map([['solo', new Set(['2026-08-25'])]])
  const result = filterEffectiveRouteStops(stops, new Map(), new Set(), new Map(), contractOverriddenDates)
  assert.deepEqual(result.map((stop) => stop.id), ['other-day', 'partial-demand', 'undated'])
})
