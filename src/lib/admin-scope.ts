import { db } from '@/lib/db'

export type ScopedUser = {
  id: string
  role: string
}

export async function getOwnerAdminId(user: ScopedUser): Promise<string | null> {
  if (user.role === 'SUPER_ADMIN') return null
  if (user.role === 'MIDDLE_ADMIN') return user.id
  if (user.role === 'LOW_ADMIN' || user.role === 'COURIER') {
    const lowAdmin = await db.admin.findUnique({
      where: { id: user.id },
      select: { createdBy: true }
    })
    return lowAdmin?.createdBy ?? user.id
  }
  return user.id
}

export async function getGroupAdminIds(user: ScopedUser): Promise<string[] | null> {
  if (user.role === 'SUPER_ADMIN') return null

  const ownerAdminId = await getOwnerAdminId(user)
  if (!ownerAdminId) return null

  const groupMembers = await db.admin.findMany({
    where: { createdBy: ownerAdminId },
    select: { id: true }
  })

  return [ownerAdminId, ...groupMembers.map(a => a.id)]
}

export async function filterCustomerIdsInGroup(
  customerIds: string[],
  groupAdminIds: string[] | null
): Promise<string[]> {
  if (!Array.isArray(customerIds) || customerIds.length === 0) return []
  if (!groupAdminIds) return customerIds

  const rows = await db.customer.findMany({
    where: {
      id: { in: customerIds },
      createdBy: { in: groupAdminIds }
    },
    select: { id: true }
  })
  return rows.map(r => r.id)
}

export async function isCustomerInGroup(
  customerId: string,
  groupAdminIds: string[] | null
): Promise<boolean> {
  if (!customerId) return false
  if (!groupAdminIds) return true

  const row = await db.customer.findFirst({
    where: { id: customerId, createdBy: { in: groupAdminIds } },
    select: { id: true }
  })
  return !!row
}

