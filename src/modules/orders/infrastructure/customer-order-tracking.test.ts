import { describe, it, expect } from 'vitest'
import { toCustomerTracking } from './order.repository'

// ── Mock rows ────────────────────────────────────────────────────────────────

function makeTrackingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 7,
    orderStatus: 'IN_DELIVERY',
    customerId: 'cust-1',
    createdAt: new Date('2024-06-10T08:00:00Z'),
    deliveryDate: new Date('2024-06-15T00:00:00Z'),
    deliveryAddress: '123 Main St',
    deliveryTime: '12:00',
    quantity: 2,
    calories: 2000,
    paymentStatus: 'UNPAID',
    etaMinutes: 25,
    courier: {
      name: 'Alex',
      phone: '+998900000000',
      latitude: 41.31,
      longitude: 69.24,
    },
    ...overrides,
  }
}

// ── toCustomerTracking ───────────────────────────────────────────────────────

describe('toCustomerTracking', () => {
  it('maps a row with an assigned courier to the customer DTO', () => {
    const result = toCustomerTracking(makeTrackingRow() as never)

    expect(result).toEqual({
      id: 'order-1',
      orderNumber: 7,
      orderStatus: 'IN_DELIVERY',
      deliveryDate: '2024-06-15',
      deliveryAddress: '123 Main St',
      deliveryTime: '12:00',
      quantity: 2,
      calories: 2000,
      paymentStatus: 'UNPAID',
      etaMinutes: 25,
      courier: {
        name: 'Alex',
        phone: '+998900000000',
        latitude: 41.31,
        longitude: 69.24,
      },
    })
  })

  it('returns courier=null when no courier is assigned', () => {
    const result = toCustomerTracking(makeTrackingRow({ courier: null }) as never)
    expect(result.courier).toBeNull()
  })

  it('falls back to an empty phone string when courier phone is missing', () => {
    const result = toCustomerTracking(
      makeTrackingRow({
        courier: { name: 'Bob', phone: null, latitude: null, longitude: null },
      }) as never,
    )
    expect(result.courier).toEqual({
      name: 'Bob',
      phone: '',
      latitude: null,
      longitude: null,
    })
  })

  it('falls back to createdAt when deliveryDate is null', () => {
    const result = toCustomerTracking(
      makeTrackingRow({ deliveryDate: null }) as never,
    )
    expect(result.deliveryDate).toBe('2024-06-10')
  })

  it('does not leak admin/audit fields (only tracking keys present)', () => {
    const result = toCustomerTracking(makeTrackingRow() as never)
    expect(Object.keys(result).sort()).toEqual(
      [
        'calories',
        'courier',
        'deliveryAddress',
        'deliveryDate',
        'deliveryTime',
        'etaMinutes',
        'id',
        'orderNumber',
        'orderStatus',
        'paymentStatus',
        'quantity',
      ].sort(),
    )
  })
})
