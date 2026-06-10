import { describe, it, expect } from 'vitest'
import { parseDeliveryDays, toListItem, toDetail, toBinItem } from './customer.repository'
import type { CustomerListItem, CustomerDetail, CustomerBinItem } from '../contracts'

// ── Mock data ────────────────────────────────────────────────────────────────

const DEFAULT_DELIVERY_DAYS = {
  monday: false, tuesday: false, wednesday: false,
  thursday: false, friday: false, saturday: false, sunday: false,
}

function makeMockListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    name: 'John Doe',
    nickName: 'Johnny',
    phone: '+1234567890',
    address: '123 Main St',
    calories: 2000,
    planType: 'CLASSIC',
    dailyPrice: 84000,
    balance: 50000,
    notes: 'Some notes',
    preferences: 'No spicy',
    deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: false, thursday: true, friday: true, saturday: false, sunday: false }),
    autoOrdersEnabled: true,
    isActive: true,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-06-14T12:00:00Z'),
    latitude: 41.3,
    longitude: 69.2,
    defaultCourierId: null,
    assignedSetId: null,
    defaultCourier: null,
    assignedSet: null,
    ...overrides,
  } as any
}

function makeMockDetailRow(overrides: Record<string, unknown> = {}) {
  const { deletedAt, deletedBy, createdBy, ...listOverrides } = overrides
  return {
    ...makeMockListRow(listOverrides),
    deletedAt: deletedAt ?? null,
    deletedBy: deletedBy ?? null,
    createdBy: createdBy ?? 'admin-1',
  } as any
}

function makeMockBinRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    name: 'John Doe',
    phone: '+1234567890',
    address: '123 Main St',
    isActive: false,
    deletedAt: new Date('2024-07-01T00:00:00Z'),
    deletedBy: 'admin-1',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    ...overrides,
  } as any
}

// ── parseDeliveryDays ────────────────────────────────────────────────────────

describe('parseDeliveryDays', () => {
  it('parses valid JSON delivery days', () => {
    const json = JSON.stringify({ monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: false, sunday: false })
    const result = parseDeliveryDays(json)
    expect(result.monday).toBe(true)
    expect(result.tuesday).toBe(false)
    expect(result.wednesday).toBe(true)
  })

  it('returns defaults for null input', () => {
    const result = parseDeliveryDays(null)
    expect(result).toEqual(DEFAULT_DELIVERY_DAYS)
  })

  it('returns defaults for invalid JSON', () => {
    const result = parseDeliveryDays('not-json')
    expect(result).toEqual(DEFAULT_DELIVERY_DAYS)
  })
})

// ── toListItem ───────────────────────────────────────────────────────────────

describe('toListItem', () => {
  it('maps all fields correctly', () => {
    const row = makeMockListRow()
    const result = toListItem(row)

    expect(result.id).toBe('cust-1')
    expect(result.name).toBe('John Doe')
    expect(result.nickName).toBe('Johnny')
    expect(result.phone).toBe('+1234567890')
    expect(result.address).toBe('123 Main St')
    expect(result.calories).toBe(2000)
    expect(result.planType).toBe('CLASSIC')
    expect(result.dailyPrice).toBe(84000)
    expect(result.balance).toBe(50000)
    expect(result.notes).toBe('Some notes')
    expect(result.specialFeatures).toBe('No spicy') // preferences → specialFeatures
    expect(result.autoOrdersEnabled).toBe(true)
    expect(result.isActive).toBe(true)
    expect(result.createdAt).toBe('2024-01-15T08:00:00.000Z')
    expect(result.defaultCourierId).toBeNull()
    expect(result.defaultCourierName).toBeNull()
    expect(result.assignedSetId).toBeNull()
    expect(result.assignedSetName).toBeNull()
    expect(result.latitude).toBe(41.3)
    expect(result.longitude).toBe(69.2)
  })

  it('maps delivery days as parsed object', () => {
    const row = makeMockListRow()
    const result = toListItem(row)
    expect(result.deliveryDays.monday).toBe(true)
    expect(result.deliveryDays.tuesday).toBe(true)
    expect(result.deliveryDays.wednesday).toBe(false)
  })

  it('maps courier name when assigned', () => {
    const row = makeMockListRow({
      defaultCourierId: 'courier-1',
      defaultCourier: { id: 'courier-1', name: 'Bob' },
    })
    const result = toListItem(row)
    expect(result.defaultCourierId).toBe('courier-1')
    expect(result.defaultCourierName).toBe('Bob')
  })

  it('maps set name when assigned', () => {
    const row = makeMockListRow({
      assignedSetId: 'set-1',
      assignedSet: { id: 'set-1', name: 'Set A' },
    })
    const result = toListItem(row)
    expect(result.assignedSetId).toBe('set-1')
    expect(result.assignedSetName).toBe('Set A')
  })

  it('applies defaults for missing values', () => {
    const row = makeMockListRow({
      calories: 0,
      dailyPrice: 0,
      balance: 0,
      notes: null,
      preferences: null,
      deliveryDays: null,
    })
    const result = toListItem(row)
    expect(result.calories).toBe(2000) // default
    expect(result.dailyPrice).toBe(84000) // default
    expect(result.balance).toBe(0)
    expect(result.notes).toBe('')
    expect(result.specialFeatures).toBe('')
    expect(result.deliveryDays).toEqual(DEFAULT_DELIVERY_DAYS)
  })

  it('maps preferences field to specialFeatures', () => {
    const row = makeMockListRow({ preferences: 'Gluten free' })
    const result = toListItem(row)
    expect(result.specialFeatures).toBe('Gluten free')
  })
})

// ── toDetail ─────────────────────────────────────────────────────────────────

describe('toDetail', () => {
  it('maps all detail fields including audit fields', () => {
    const row = makeMockDetailRow()
    const result = toDetail(row)

    // Base fields from toListItem
    expect(result.id).toBe('cust-1')
    expect(result.name).toBe('John Doe')

    // Detail-specific fields
    expect(result.updatedAt).toBe('2024-06-14T12:00:00.000Z')
    expect(result.deletedAt).toBeNull()
    expect(result.deletedBy).toBeNull()
    expect(result.createdBy).toBe('admin-1')
  })

  it('maps deletedAt as ISO string when present', () => {
    const row = makeMockDetailRow({
      deletedAt: new Date('2024-07-01T00:00:00Z'),
      deletedBy: 'admin-2',
    })
    const result = toDetail(row)
    expect(result.deletedAt).toBe('2024-07-01T00:00:00.000Z')
    expect(result.deletedBy).toBe('admin-2')
  })
})

// ── toBinItem ────────────────────────────────────────────────────────────────

describe('toBinItem', () => {
  it('maps minimal bin fields correctly', () => {
    const row = makeMockBinRow()
    const result = toBinItem(row)

    expect(result.id).toBe('cust-1')
    expect(result.name).toBe('John Doe')
    expect(result.phone).toBe('+1234567890')
    expect(result.address).toBe('123 Main St')
    expect(result.isActive).toBe(false)
    expect(result.deletedAt).toBe('2024-07-01T00:00:00.000Z')
    expect(result.deletedBy).toBe('admin-1')
    expect(result.createdAt).toBe('2024-01-15T08:00:00.000Z')
  })

  it('handles null deletedAt', () => {
    const row = makeMockBinRow({ deletedAt: null })
    const result = toBinItem(row)
    expect(result.deletedAt).toBeNull()
  })
})
