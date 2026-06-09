import { db } from '@/lib/db'
import { OrderEventType, type OrderStatus, type Prisma } from '@prisma/client'

type DbOrTx = Prisma.TransactionClient | typeof db

type AppendOrderAuditInput = {
  orderId: string
  eventType: OrderEventType
  actorAdminId?: string | null
  actorRole?: string | null
  actorName?: string | null
  previousStatus?: OrderStatus | null
  nextStatus?: OrderStatus | null
  payload?: Prisma.InputJsonValue
  message?: string | null
}

export async function appendOrderAudit(
  target: DbOrTx,
  input: AppendOrderAuditInput
) {
  await target.orderAuditEvent.create({
    data: {
      orderId: input.orderId,
      eventType: input.eventType,
      actorAdminId: input.actorAdminId ?? null,
      actorRole: input.actorRole ?? null,
      actorName: input.actorName ?? null,
      previousStatus: input.previousStatus ?? null,
      nextStatus: input.nextStatus ?? null,
      payload: input.payload,
      message: input.message ?? null,
    },
  })
}

export function getStatusTimestampPatch(nextStatus: OrderStatus): Prisma.OrderUpdateInput {
  const now = new Date()

  if (nextStatus === 'IN_DELIVERY') {
    return { statusChangedAt: now, pickedUpAt: now, resumedAt: now }
  }
  if (nextStatus === 'PAUSED') {
    return { statusChangedAt: now, pausedAt: now }
  }
  if (nextStatus === 'DELIVERED') {
    return { statusChangedAt: now, deliveredAt: now, confirmedAt: now }
  }
  if (nextStatus === 'FAILED') {
    return { statusChangedAt: now, failedAt: now }
  }
  if (nextStatus === 'CANCELED') {
    return { statusChangedAt: now, canceledAt: now }
  }

  return { statusChangedAt: now }
}

export function getCourierAssignmentPatch(
  previousCourierId: string | null | undefined,
  nextCourierId: string | null | undefined
): Prisma.OrderUpdateInput {
  if (!previousCourierId && nextCourierId) {
    return { assignedAt: new Date() }
  }
  return {}
}

