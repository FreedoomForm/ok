export const resourceDetailEntities = ['order', 'client', 'admin'] as const

export type ResourceDetailEntity = (typeof resourceDetailEntities)[number]

export type DerivedContract = {
  id: string
  type: 'ORDER' | 'DELIVERY_PLAN' | 'EMPLOYMENT'
  title: string
  status: string
  startedAt: Date
  endsAt: Date | null
  terms: Record<string, unknown>
}

export type OrderContractSource = {
  id: string
  orderNumber: number
  orderStatus: string
  createdAt: Date
  deliveredAt: Date | null
  canceledAt: Date | null
  failedAt: Date | null
  quantity: number
  calories: number
  deliveryDate: Date | null
  deliveryTime: string | null
  paymentStatus: string
  paymentMethod: string
}

export type ClientContractSource = {
  id: string
  createdAt: Date
  deletedAt: Date | null
  assignedSet: { id: string; name: string } | null
  planType: string
  isActive: boolean
  dailyPrice: number
  calories: number
  deliveryDays: string | null
  autoOrdersEnabled: boolean
}

export type AdminContractSource = {
  id: string
  createdAt: Date
  role: string
  isActive: boolean
  salary: number
  transportType: string | null
  vehicleNumber: string | null
}

export function isResourceDetailEntity(value: string | null): value is ResourceDetailEntity {
  return value !== null && resourceDetailEntities.includes(value as ResourceDetailEntity)
}

export function buildOrderContract(order: OrderContractSource): DerivedContract {
  return {
    id: order.id,
    type: 'ORDER',
    title: `Order #${order.orderNumber}`,
    status: order.orderStatus,
    startedAt: order.createdAt,
    endsAt: order.deliveredAt ?? order.canceledAt ?? order.failedAt,
    terms: {
      quantity: order.quantity,
      calories: order.calories,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    },
  }
}

export function buildClientContract(client: ClientContractSource): DerivedContract {
  return {
    id: client.id,
    type: 'DELIVERY_PLAN',
    title: client.assignedSet?.name ?? client.planType,
    status: client.isActive ? 'ACTIVE' : 'PAUSED',
    startedAt: client.createdAt,
    endsAt: client.deletedAt,
    terms: {
      dailyPrice: client.dailyPrice,
      calories: client.calories,
      deliveryDays: client.deliveryDays,
      autoOrdersEnabled: client.autoOrdersEnabled,
      assignedSet: client.assignedSet,
    },
  }
}

export function buildAdminContract(admin: AdminContractSource): DerivedContract {
  return {
    id: admin.id,
    type: 'EMPLOYMENT',
    title: admin.role,
    status: admin.isActive ? 'ACTIVE' : 'INACTIVE',
    startedAt: admin.createdAt,
    endsAt: null,
    terms: {
      salary: admin.salary,
      transportType: admin.transportType,
      vehicleNumber: admin.vehicleNumber,
    },
  }
}

export function sortTransactionsByCreatedAt<T extends { createdAt: Date }>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function buildScopedAdminWhere(id: string, adminIds: string[] | null): {
  id: string | { equals: string; in: string[] }
} {
  return adminIds ? { id: { equals: id, in: adminIds } } : { id }
}
