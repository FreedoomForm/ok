import { Prisma } from '@prisma/client'

/**
 * Allocates the next globally unique order number inside the caller's transaction.
 *
 * The PostgreSQL transaction advisory lock must be acquired and the order row must
 * be created using the same transaction client. The lock is released automatically
 * when that transaction commits or rolls back.
 */
export async function acquireOrderNumberLock(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(741243146::bigint)`
}

export async function allocateOrderNumber(tx: Prisma.TransactionClient): Promise<number> {
  await acquireOrderNumberLock(tx)

  const lastOrder = await tx.order.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })

  return (lastOrder?.orderNumber ?? 0) + 1
}
