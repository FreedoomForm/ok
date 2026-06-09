import { db } from '@/lib/db'

export async function getSiteBySubdomain(subdomain: string) {
  return db.website.findUnique({
    where: { subdomain },
    select: {
      id: true,
      adminId: true,
      subdomain: true,
      chatEnabled: true,
      theme: true,
      content: true,
    },
  })
}

export async function getSiteGroupAdminIds(ownerAdminId: string) {
  const lowAdmins = await db.admin.findMany({
    where: {
      createdBy: ownerAdminId,
      role: 'LOW_ADMIN',
    },
    select: { id: true },
  })

  return [ownerAdminId, ...lowAdmins.map((admin) => admin.id)]
}

export async function getOwnerAdminIdForCustomer(createdBy: string | null) {
  if (!createdBy) return null

  const creator = await db.admin.findUnique({
    where: { id: createdBy },
    select: { id: true, role: true, createdBy: true },
  })

  if (!creator) return createdBy
  if (creator.role === 'LOW_ADMIN') return creator.createdBy ?? creator.id
  return creator.id
}
