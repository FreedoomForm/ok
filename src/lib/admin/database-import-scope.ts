import { db } from '@/lib/db'
import { getAdminScope, type ScopedUser } from '@/lib/admin-scope'
import type { TableId } from '@/lib/admin/database-xlsx-mapping'

export type RowUpdateScope = (tableId: TableId, id: string) => Promise<boolean>

export async function createRowUpdateScope(user: ScopedUser): Promise<RowUpdateScope> {
  if (user.role === 'SUPER_ADMIN') return async () => true

  const scope = await getAdminScope(user)
  return (tableId, id) => canUpdateRow(scope, tableId, id)
}

async function canUpdateRow(
  scope: Awaited<ReturnType<typeof getAdminScope>>,
  tableId: TableId,
  id: string,
): Promise<boolean> {
  const { groupAdminIds, ownerAdminId } = scope

  switch (tableId) {
    case 'admins': {
      const row = await db.admin.findUnique({ where: { id }, select: { id: true, createdBy: true } })
      if (!row) return false
      return Boolean(groupAdminIds?.includes(row.id) || (ownerAdminId && row.createdBy === ownerAdminId))
    }
    case 'customers': {
      const row = await db.customer.findUnique({ where: { id }, select: { id: true, createdBy: true } })
      if (!row) return false
      return Boolean(!groupAdminIds || (row.createdBy && groupAdminIds.includes(row.createdBy)))
    }
    case 'orders': {
      const row = await db.order.findUnique({
        where: { id },
        select: { id: true, adminId: true, customer: { select: { createdBy: true } } },
      })
      if (!row) return false
      if (row.adminId && groupAdminIds?.includes(row.adminId)) return true
      return Boolean(row.customer?.createdBy && groupAdminIds?.includes(row.customer.createdBy))
    }
    case 'transactions': {
      const row = await db.transaction.findUnique({
        where: { id },
        select: { id: true, adminId: true, customer: { select: { createdBy: true } } },
      })
      if (!row) return false
      if (row.adminId && groupAdminIds?.includes(row.adminId)) return true
      return Boolean(row.customer?.createdBy && groupAdminIds?.includes(row.customer.createdBy))
    }
    case 'websites': {
      const row = await db.website.findUnique({ where: { id }, select: { id: true, adminId: true } })
      if (!row) return false
      return Boolean(ownerAdminId && row.adminId === ownerAdminId)
    }
    case 'menuSets': {
      const row = await db.menuSet.findUnique({ where: { id }, select: { id: true, adminId: true } })
      if (!row) return false
      return Boolean(ownerAdminId && row.adminId === ownerAdminId)
    }
    case 'actionLogs': {
      const row = await db.actionLog.findUnique({ where: { id }, select: { id: true, adminId: true } })
      if (!row) return false
      return Boolean(row.adminId && groupAdminIds?.includes(row.adminId))
    }
    case 'orderAudit': {
      const row = await db.orderAuditEvent.findUnique({
        where: { id },
        select: {
          id: true,
          order: { select: { adminId: true, customer: { select: { createdBy: true } } } },
        },
      })
      if (!row) return false
      if (row.order?.adminId && groupAdminIds?.includes(row.order.adminId)) return true
      return Boolean(row.order?.customer?.createdBy && groupAdminIds?.includes(row.order.customer.createdBy))
    }
    case 'menus':
    case 'dishes':
    case 'warehouse':
    case 'cookingPlans':
      return true
  }
}
