import { Prisma } from '@prisma/client'

export function buildSchedulerCustomerWhere(
  groupAdminIds: readonly string[] | null,
): Prisma.CustomerWhereInput {
  return {
    deletedAt: null,
    ...(groupAdminIds ? { createdBy: { in: [...groupAdminIds] } } : {}),
  }
}

export function buildSchedulerOrderWhere(
  groupAdminIds: readonly string[] | null,
  now: Date,
): Prisma.OrderWhereInput {
  return {
    deletedAt: null,
    deliveryDate: { gte: now },
    ...(groupAdminIds ? { adminId: { in: [...groupAdminIds] } } : {}),
  }
}
