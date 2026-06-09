import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'

type SnapshotTable = {
  id: string
  title: string
  description: string
  rowCount: number
  columns: string[]
  rows: Record<string, string>[]
}

type SnapshotRecord = Record<string, unknown>

function serializeValue(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function toRows<T extends Record<string, unknown>>(records: T[]) {
  return records.map((record) => {
    const normalized: Record<string, string> = {}
    Object.entries(record).forEach(([key, value]) => {
      normalized[key] = serializeValue(value)
    })
    return normalized
  })
}

function collectColumns(rows: Record<string, string>[]) {
  const columns = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columns.add(key))
  })
  return Array.from(columns)
}

function createSnapshotTable({
  id,
  title,
  description,
  records,
}: {
  id: string
  title: string
  description: string
  records: SnapshotRecord[]
}): SnapshotTable {
  const rows = toRows(records)
  return {
    id,
    title,
    description,
    rowCount: rows.length,
    columns: collectColumns(rows),
    rows,
  }
}

function renameRecordKey(records: SnapshotRecord[], fromKey: string, toKey: string): SnapshotRecord[] {
  return records.map((record) => {
    if (!(fromKey in record)) return record
    const next: SnapshotRecord = { ...record }
    if (!(toKey in next)) {
      next[toKey] = next[fromKey]
    }
    delete next[fromKey]
    return next
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    let createdAtFilter = {}
    let updatedAtFilter = {}
    let dateFilter = {}
    let occurredAtFilter = {}

    if (startParam && endParam) {
      const startDate = new Date(startParam)
      const endDate = new Date(endParam)

      createdAtFilter = { createdAt: { gte: startDate, lt: endDate } }
      updatedAtFilter = { updatedAt: { gte: startDate, lt: endDate } }
      dateFilter = { date: { gte: startDate, lt: endDate } }
      occurredAtFilter = { occurredAt: { gte: startDate, lt: endDate } }
    }

    const groupAdminIds = await getGroupAdminIds(user)
    const ownerAdminId = await getOwnerAdminId(user)

    const adminWhere =
      user.role === 'SUPER_ADMIN'
        ? {}
        : {
            OR: [
              { id: { in: groupAdminIds ?? [user.id] } },
              ...(ownerAdminId ? [{ createdBy: ownerAdminId }] : []),
            ],
          }

    const customerWhere =
      user.role === 'SUPER_ADMIN'
        ? {}
        : { createdBy: { in: groupAdminIds ?? [user.id] } }

    const orderWhere =
      user.role === 'SUPER_ADMIN'
        ? {}
        : { adminId: { in: groupAdminIds ?? [user.id] } }

    const [admins, customers, orders, transactions, websites, menuSets, menus, dishes, warehouseItems, dailyCookingPlans, actionLogs, orderAuditEvents] =
      await Promise.all([
        db.admin.findMany({
          where: { ...adminWhere, ...createdAtFilter },
          orderBy: { createdAt: 'desc' },
        }),
        db.customer.findMany({
          where: { ...customerWhere, ...createdAtFilter },
          orderBy: { createdAt: 'desc' },
        }),
        db.order.findMany({
          where: { ...orderWhere, ...createdAtFilter },
          orderBy: { createdAt: 'desc' },
        }),
        db.transaction.findMany({
          where: {
            ...(user.role === 'SUPER_ADMIN'
              ? {}
              : {
                  OR: [
                    { adminId: { in: groupAdminIds ?? [user.id] } },
                    { customer: { createdBy: { in: groupAdminIds ?? [user.id] } } },
                  ],
                }),
            ...createdAtFilter,
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.website.findMany({
          where: { ...(user.role === 'SUPER_ADMIN' ? {} : { adminId: ownerAdminId ?? user.id }), ...updatedAtFilter },
          orderBy: { updatedAt: 'desc' },
        }),
        db.menuSet.findMany({
          where: { ...(user.role === 'SUPER_ADMIN' ? {} : { adminId: ownerAdminId ?? user.id }), ...updatedAtFilter },
          orderBy: { updatedAt: 'desc' },
        }),
        db.menu.findMany({
          orderBy: { number: 'asc' },
        }),
        db.dish.findMany({
          where: { ...updatedAtFilter },
          orderBy: { updatedAt: 'desc' },
        }),
        db.warehouseItem.findMany({
          where: { ...updatedAtFilter },
          orderBy: { updatedAt: 'desc' },
        }),
        db.dailyCookingPlan.findMany({
          where: { ...dateFilter },
          orderBy: { date: 'desc' },
        }),
        db.actionLog.findMany({
          where: { ...(user.role === 'SUPER_ADMIN' ? {} : { adminId: { in: groupAdminIds ?? [user.id] } }), ...createdAtFilter },
          orderBy: { createdAt: 'desc' },
        }),
        db.orderAuditEvent.findMany({
          where: {
            ...(user.role === 'SUPER_ADMIN'
              ? {}
              : { order: { adminId: { in: groupAdminIds ?? [user.id] } } }),
            ...occurredAtFilter,
          },
          orderBy: { occurredAt: 'desc' },
        }),
      ])

    const tables: SnapshotTable[] = [
      createSnapshotTable({
        id: 'admins',
        title: 'Admins',
        description: 'Full admin rows from Neon in your current access scope.',
        records: admins as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'customers',
        title: 'Customers',
        description: 'Full customer rows from Neon in your current access scope.',
        records: customers as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'orders',
        title: 'Orders',
        description: 'Full order rows from Neon in your current access scope.',
        records: renameRecordKey(orders as SnapshotRecord[], 'calorieGroups', 'groups'),
      }),
      createSnapshotTable({
        id: 'transactions',
        title: 'Transactions',
        description: 'Full transaction rows from Neon in your current access scope.',
        records: transactions as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'websites',
        title: 'Websites',
        description: 'Full website rows from Neon in your current access scope.',
        records: websites as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'menuSets',
        title: 'Menu Sets',
        description: 'Full menu set rows from Neon in your current access scope.',
        records: renameRecordKey(menuSets as SnapshotRecord[], 'calorieGroups', 'groups'),
      }),
      createSnapshotTable({
        id: 'menus',
        title: 'Menus',
        description: 'Full menu rows from Neon.',
        records: menus as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'dishes',
        title: 'Dishes',
        description: 'Full dish rows from Neon.',
        records: dishes as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'warehouse',
        title: 'Warehouse',
        description: 'Full warehouse rows from Neon.',
        records: warehouseItems as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'cookingPlans',
        title: 'Cooking Plans',
        description: 'Full daily cooking plan rows from Neon.',
        records: dailyCookingPlans as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'actionLogs',
        title: 'Action Logs',
        description: 'Full action log rows from Neon in your current access scope.',
        records: actionLogs as SnapshotRecord[],
      }),
      createSnapshotTable({
        id: 'orderAudit',
        title: 'Order Audit',
        description: 'Full order audit rows from Neon in your current access scope.',
        records: orderAuditEvents as SnapshotRecord[],
      }),
    ]

    const summary = tables.map((table) => ({
      id: table.id,
      title: table.title,
      description: table.description,
      rowCount: table.rowCount,
      columnCount: table.columns.length,
    }))

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      scope: user.role === 'SUPER_ADMIN' ? 'Global' : 'Owner group',
      tables,
      summary,
    })
  } catch (error) {
    // eslint-disable-next-line no-console -- route diagnostics for Neon snapshot failures.
    console.error('Error building database snapshot:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build Neon database snapshot' },
      { status: 500 }
    )
  }
}
