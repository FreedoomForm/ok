import { describe, it, expect } from 'vitest'
import { formatDeliveryDate, toListItem, toDetail, toCustomerSnapshot } from './order.repository'
import type { OrderListItem, OrderDetail } from '../contracts'

// ── Mock data ────────────────────────────────────────────────────────────────

function makeMockListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 42,
    orderStatus: 'PENDING',
    customerId: 'cust-1',
    deliveryDate: new Date('2024-06-15'),
    deliveryAddress: '123 Main St',
    deliveryTime: '12:00',
    quantity: 1,
    calories: 2000,
    specialFeatures: '',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    isPrepaid: false,
    amountReceived: null,
    courierId: null,
    fromAutoOrder: false,
    orderType: 'MORNING',
    priority: 1,
    sourceChannel: 'manual',
    latitude: null,
    longitude: null,
    deletedAt: null,
    createdAt: new Date('2024-06-14T10:30:00Z'),
    updatedAt: new Date('2024-06-14T12:00:00Z'),
    customer: {
      name: 'John Doe',
      phone: '+1234567890',
      assignedSetId: null,
      assignedSet: null,
    },
    courier: null,
    ...overrides,
  } as any
}

function makeMockDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 42,
    orderStatus: 'PENDING',
    customerId: 'cust-1',
    adminId: 'admin-1',
    deliveryDate: new Date('2024-06-15'),
    deliveryAddress: '123 Main St',
    deliveryTime: '12:00',
    quantity: 1,
    calories: 2000,
    specialFeatures: '',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    isPrepaid: false,
    amountReceived: null,
    courierId: null,
    fromAutoOrder: false,
    orderType: 'MORNING',
    priority: 1,
    sourceChannel: 'manual',
    latitude: null,
    longitude: null,
    etaMinutes: null,
    routeDistanceKm: null,
    routeDurationMin: null,
    sequenceInRoute: null,
    customerRating: null,
    customerFeedback: null,
    lastLatitude: null,
    lastLongitude: null,
    lastLocationAt: null,
    statusChangedAt: null,
    assignedAt: null,
    pickedUpAt: null,
    pausedAt: null,
    resumedAt: null,
    deliveredAt: null,
    failedAt: null,
    canceledAt: null,
    confirmedAt: null,
    deletedAt: null,
    createdAt: new Date('2024-06-14T10:30:00Z'),
    updatedAt: new Date('2024-06-14T12:00:00Z'),
    customer: {
      name: 'John Doe',
      phone: '+1234567890',
      assignedSetId: null,
      assignedSet: null,
    },
    courier: null,
    ...overrides,
  } as any
}

// ── formatDeliveryDate ───────────────────────────────────────────────────────

describe('formatDeliveryDate', () => {
  it('formats deliveryDate as YYYY-MM-DD when present', () => {
    expect(formatDeliveryDate(new Date('2024-06-15'), new Date('2024-01-01'))).toBe('2024-06-15')
  })

  it('falls back to createdAt when deliveryDate is null', () => {
    expect(formatDeliveryDate(null, new Date('2024-06-14T10:30:00Z'))).toBe('2024-06-14')
  })
})

// ── toCustomerSnapshot ───────────────────────────────────────────────────────

describe('toCustomerSnapshot', () => {
  it('maps customer fields correctly', () => {
    const customer = {
      name: 'Alice',
      phone: '+111',
      assignedSetId: 'set-1',
      assignedSet: { id: 'set-1', name: 'Set A' },
    }
    const result = toCustomerSnapshot(customer as any)
    expect(result.name).toBe('Alice')
    expect(result.phone).toBe('+111')
    expect(result.assignedSetId).toBe('set-1')
    expect(result.assignedSetName).toBe('Set A')
  })

  it('handles null customer gracefully', () => {
    const result = toCustomerSnapshot(null as any)
    expect(result.name).toBe('Неизвестный клиент')
    expect(result.phone).toBe('Нет телефона')
    expect(result.assignedSetId).toBeNull()
    expect(result.assignedSetName).toBeNull()
  })
})

// ── toListItem ───────────────────────────────────────────────────────────────

describe('toListItem', () => {
  it('maps all fields correctly', () => {
    const row = makeMockListRow()
    const result = toListItem(row)

    expect(result.id).toBe('order-1')
    expect(result.orderNumber).toBe(42)
    expect(result.orderStatus).toBe('PENDING')
    expect(result.customerId).toBe('cust-1')
    expect(result.customerName).toBe('John Doe')
    expect(result.customerPhone).toBe('+1234567890')
    expect(result.assignedSetId).toBeNull()
    expect(result.assignedSetName).toBeNull()
    expect(result.deliveryDate).toBe('2024-06-15')
    expect(result.deliveryAddress).toBe('123 Main St')
    expect(result.deliveryTime).toBe('12:00')
    expect(result.quantity).toBe(1)
    expect(result.calories).toBe(2000)
    expect(result.paymentStatus).toBe('UNPAID')
    expect(result.paymentMethod).toBe('CASH')
    expect(result.isPrepaid).toBe(false)
    expect(result.amountReceived).toBeNull()
    expect(result.courierId).toBeNull()
    expect(result.courierName).toBeNull()
    expect(result.isAutoOrder).toBe(false)
    expect(result.orderType).toBe('MORNING')
    expect(result.deletedAt).toBeNull()
    expect(result.createdAt).toBe('2024-06-14T10:30:00.000Z')
  })

  it('maps courier name when assigned', () => {
    const row = makeMockListRow({
      courierId: 'courier-1',
      courier: { id: 'courier-1', name: 'Bob' },
    })
    const result = toListItem(row)
    expect(result.courierId).toBe('courier-1')
    expect(result.courierName).toBe('Bob')
  })

  it('maps deletedAt as ISO string', () => {
    const row = makeMockListRow({
      deletedAt: new Date('2024-07-01T00:00:00Z'),
    })
    const result = toListItem(row)
    expect(result.deletedAt).toBe('2024-07-01T00:00:00.000Z')
  })

  it('maps fromAutoOrder to isAutoOrder', () => {
    const row = makeMockListRow({ fromAutoOrder: true })
    const result = toListItem(row)
    expect(result.isAutoOrder).toBe(true)
  })

  it('includes customer snapshot', () => {
    const row = makeMockListRow({
      customer: {
        name: 'Jane',
        phone: '+999',
        assignedSetId: 'set-2',
        assignedSet: { id: 'set-2', name: 'Set B' },
      },
    })
    const result = toListItem(row)
    expect(result.customer.name).toBe('Jane')
    expect(result.customer.phone).toBe('+999')
    expect(result.customer.assignedSetId).toBe('set-2')
    expect(result.customer.assignedSetName).toBe('Set B')
  })
})

// ── toDetail ─────────────────────────────────────────────────────────────────

describe('toDetail', () => {
  it('maps all detail fields correctly', () => {
    const row = makeMockDetailRow()
    const result = toDetail(row)

    // Base fields
    expect(result.id).toBe('order-1')
    expect(result.orderNumber).toBe(42)
    expect(result.orderStatus).toBe('PENDING')

    // Detail-specific fields
    expect(result.adminId).toBe('admin-1')
    expect(result.etaMinutes).toBeNull()
    expect(result.routeDistanceKm).toBeNull()
    expect(result.routeDurationMin).toBeNull()
    expect(result.sequenceInRoute).toBeNull()
    expect(result.customerRating).toBeNull()
    expect(result.customerFeedback).toBeNull()
    expect(result.lastLatitude).toBeNull()
    expect(result.lastLongitude).toBeNull()
    expect(result.lastLocationAt).toBeNull()
    expect(result.statusChangedAt).toBeNull()
    expect(result.assignedAt).toBeNull()
    expect(result.pickedUpAt).toBeNull()
    expect(result.pausedAt).toBeNull()
    expect(result.resumedAt).toBeNull()
    expect(result.deliveredAt).toBeNull()
    expect(result.failedAt).toBeNull()
    expect(result.canceledAt).toBeNull()
    expect(result.confirmedAt).toBeNull()
    expect(result.updatedAt).toBe('2024-06-14T12:00:00.000Z')
  })

  it('maps timestamp fields as ISO strings when present', () => {
    const row = makeMockDetailRow({
      statusChangedAt: new Date('2024-06-14T11:00:00Z'),
      assignedAt: new Date('2024-06-14T11:05:00Z'),
      deliveredAt: new Date('2024-06-14T13:00:00Z'),
    })
    const result = toDetail(row)
    expect(result.statusChangedAt).toBe('2024-06-14T11:00:00.000Z')
    expect(result.assignedAt).toBe('2024-06-14T11:05:00.000Z')
    expect(result.deliveredAt).toBe('2024-06-14T13:00:00.000Z')
  })
})
