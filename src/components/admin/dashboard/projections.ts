import type { Client, Order } from '@/components/admin/dashboard/types'

export type ClientFinanceProjection = {
  balance: number
  dailyPrice: number
}

function searchableText(values: unknown[]): string {
  return values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .join(' ')
    .toLowerCase()
}

export function filterDeletedOrders(orders: Order[], query: string): Order[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return orders
  return orders.filter((order) => searchableText([
    order.id,
    order.orderStatus,
    order.customer?.name,
    order.customer?.phone,
  ]).includes(normalizedQuery))
}

export function filterDeletedClients(clients: Client[], query: string): Client[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return clients
  return clients.filter((client) => searchableText([
    client.name,
    client.phone,
    client.address,
  ]).includes(normalizedQuery))
}

export function parseClientFinanceProjections(value: unknown): Record<string, ClientFinanceProjection> {
  if (!Array.isArray(value)) return {}
  const next: Record<string, ClientFinanceProjection> = {}

  for (const row of value) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) continue
    const candidate = row as Record<string, unknown>
    if (typeof candidate.id !== 'string') continue
    if (typeof candidate.balance !== 'number' || !Number.isFinite(candidate.balance)) continue
    next[candidate.id] = {
      balance: candidate.balance,
      dailyPrice: typeof candidate.dailyPrice === 'number' && Number.isFinite(candidate.dailyPrice)
        ? candidate.dailyPrice
        : 0,
    }
  }

  return next
}

export function hasActiveDispatchedOrder(orders: Order[], isToday: boolean): boolean {
  if (!isToday) return false
  return orders.some((order) => Boolean(order.courierId) && order.orderStatus !== 'NEW' && order.orderStatus !== 'IN_PROCESS')
}
