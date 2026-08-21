import type { Prisma, PrismaClient } from '@prisma/client'

import type { DatabaseTableId } from '@/lib/admin/database-row'

export type DatabaseRowWriteData = Record<string, unknown>

export async function createDatabaseRow(
  db: PrismaClient,
  tableId: DatabaseTableId,
  data: DatabaseRowWriteData,
): Promise<unknown> {
  switch (tableId) {
    case 'admins': return db.admin.create({ data: data as unknown as Prisma.AdminUncheckedCreateInput })
    case 'customers': return db.customer.create({ data: data as unknown as Prisma.CustomerUncheckedCreateInput })
    case 'orders': return db.order.create({ data: data as unknown as Prisma.OrderUncheckedCreateInput })
    case 'transactions': return db.transaction.create({ data: data as unknown as Prisma.TransactionUncheckedCreateInput })
    case 'websites': return db.website.create({ data: data as unknown as Prisma.WebsiteUncheckedCreateInput })
    case 'menuSets': return db.menuSet.create({ data: data as unknown as Prisma.MenuSetUncheckedCreateInput })
    case 'menus': return db.menu.create({ data: data as unknown as Prisma.MenuUncheckedCreateInput })
    case 'dishes': return db.dish.create({ data: data as unknown as Prisma.DishUncheckedCreateInput })
    case 'warehouse': return db.warehouseItem.create({ data: data as unknown as Prisma.WarehouseItemUncheckedCreateInput })
    case 'cookingPlans': return db.dailyCookingPlan.create({ data: data as unknown as Prisma.DailyCookingPlanUncheckedCreateInput })
    case 'actionLogs': return db.actionLog.create({ data: data as unknown as Prisma.ActionLogUncheckedCreateInput })
    case 'orderAudit': return db.orderAuditEvent.create({ data: data as unknown as Prisma.OrderAuditEventUncheckedCreateInput })
  }
}

export async function updateDatabaseRow(
  db: PrismaClient,
  tableId: DatabaseTableId,
  id: string,
  data: DatabaseRowWriteData,
): Promise<unknown> {
  switch (tableId) {
    case 'admins': return db.admin.update({ where: { id }, data: data as Prisma.AdminUncheckedUpdateInput })
    case 'customers': return db.customer.update({ where: { id }, data: data as Prisma.CustomerUncheckedUpdateInput })
    case 'orders': return db.order.update({ where: { id }, data: data as Prisma.OrderUncheckedUpdateInput })
    case 'transactions': return db.transaction.update({ where: { id }, data: data as Prisma.TransactionUncheckedUpdateInput })
    case 'websites': return db.website.update({ where: { id }, data: data as Prisma.WebsiteUncheckedUpdateInput })
    case 'menuSets': return db.menuSet.update({ where: { id }, data: data as Prisma.MenuSetUncheckedUpdateInput })
    case 'menus': return db.menu.update({ where: { id }, data: data as Prisma.MenuUncheckedUpdateInput })
    case 'dishes': return db.dish.update({ where: { id }, data: data as Prisma.DishUncheckedUpdateInput })
    case 'warehouse': return db.warehouseItem.update({ where: { id }, data: data as Prisma.WarehouseItemUncheckedUpdateInput })
    case 'cookingPlans': return db.dailyCookingPlan.update({ where: { id }, data: data as Prisma.DailyCookingPlanUncheckedUpdateInput })
    case 'actionLogs': return db.actionLog.update({ where: { id }, data: data as Prisma.ActionLogUncheckedUpdateInput })
    case 'orderAudit': return db.orderAuditEvent.update({ where: { id }, data: data as Prisma.OrderAuditEventUncheckedUpdateInput })
  }
}
