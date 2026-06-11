import { db } from '@/modules/shared/db'

export type ScopedUser = {
  id: string
  role: string
}

// ── In-memory cache for getGroupAdminIds (15s TTL) ────────────────────────
// Admin hierarchy changes extremely rarely (only on admin create/delete),
// yet this function was called 6-8 times per dashboard load, each time
// making 2 DB queries. Now cached for 15 seconds.

const groupCache = new Map<string, { value: string[] | null; expires: number }>()
const GROUP_CACHE_TTL_MS = 15_000

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

  // Check cache first
  const cached = groupCache.get(user.id)
  if (cached && Date.now() < cached.expires) {
    return cached.value
  }

  const ownerAdminId = await getOwnerAdminId(user)
  if (!ownerAdminId) return null

  const groupMembers = await db.admin.findMany({
    where: { createdBy: ownerAdminId },
    select: { id: true }
  })

  const result = [ownerAdminId, ...groupMembers.map(a => a.id)]

  // Store in cache
  groupCache.set(user.id, { value: result, expires: Date.now() + GROUP_CACHE_TTL_MS })

  return result
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

/** Invalidate cache for a specific user (call on admin create/delete) */
export function invalidateGroupCache(userId: string): void {
  groupCache.delete(userId)
}
