import { extractCoordsFromText } from '@/lib/geo'

export type CourierProfile = {
  id: string
  name: string
  email: string
  role: 'COURIER'
  balance: number
}

export type CourierOrder = {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
    address?: string
    latitude?: number | null
    longitude?: number | null
  }
  deliveryAddress: string
  latitude: number | null
  longitude: number | null
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  orderStatus: string
  deliveryDate?: string
  createdAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function parseCourierProfile(value: unknown): CourierProfile | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.email !== 'string') {
    return null
  }
  const balance = finiteOrNull(value.balance)
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    role: 'COURIER',
    balance: balance ?? 0,
  }
}

export function parseCourierOrders(value: unknown): CourierOrder[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!isRecord(raw) || typeof raw.id !== 'string') return []
    const customer = isRecord(raw.customer) ? raw.customer : {}
    const orderLat = finiteOrNull(raw.latitude)
    const orderLng = finiteOrNull(raw.longitude)
    const customerLat = finiteOrNull(customer.latitude)
    const customerLng = finiteOrNull(customer.longitude)
    const deliveryAddress = stringOrFallback(raw.deliveryAddress, '')
    const parsed = extractCoordsFromText(deliveryAddress)
    const latitude = orderLat ?? customerLat ?? parsed?.lat ?? null
    const longitude = orderLng ?? customerLng ?? parsed?.lng ?? null
    return [{
      ...raw,
      id: raw.id,
      orderNumber: typeof raw.orderNumber === 'number' ? raw.orderNumber : 0,
      customer: {
        ...customer,
        name: stringOrFallback(customer.name, ''),
        phone: stringOrFallback(customer.phone, ''),
      },
      deliveryAddress,
      latitude,
      longitude,
      deliveryTime: stringOrFallback(raw.deliveryTime, ''),
      quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
      calories: typeof raw.calories === 'number' ? raw.calories : 0,
      specialFeatures: stringOrFallback(raw.specialFeatures, ''),
      orderStatus: stringOrFallback(raw.orderStatus, 'NEW'),
      createdAt: stringOrFallback(raw.createdAt, ''),
    } satisfies CourierOrder]
  })
}
