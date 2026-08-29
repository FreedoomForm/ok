import { db as defaultDb } from '@/lib/db'

export interface ScopedCustomerThread {
  id: string
  name: string
  createdBy: string | null
}

type PrismaLike = {
  customer: {
    findUnique: (args: { where: { id: string }, select: { id: true, name: true, createdBy: true, isActive: true, deletedAt: true } }) => Promise<ScopedCustomerThread & { isActive: boolean, deletedAt: Date | null } | null>
  }
}

/**
 * Resolves a customer chat thread within the acting administrator's ownership
 * scope: the thread belongs to the administrator who created the customer,
 * and super-admins keep full governance visibility. Soft-deleted customers
 * never resolve.
 */
export async function resolveScopedCustomerThread(
  db: PrismaLike | typeof defaultDb,
  customerId: string,
  adminId: string,
  role: string,
): Promise<ScopedCustomerThread | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, createdBy: true, isActive: true, deletedAt: true },
  })
  if (!customer || customer.deletedAt) return null
  if (customer.createdBy !== adminId && role !== 'SUPER_ADMIN') return null
  return { id: customer.id, name: customer.name, createdBy: customer.createdBy }
}
