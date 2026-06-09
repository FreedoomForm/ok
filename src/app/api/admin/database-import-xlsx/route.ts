import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { isTableId, mapHeaderRow, TableId } from '@/lib/admin/database-xlsx-mapping'

type ImportResult = {
  ok: boolean
  tableId: TableId
  sheetName: string
  rowsTotal: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ rowIndex: number; message: string }>
}

const MAX_IMPORT_ROWS = 2000

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function coerceValue(val: string): unknown {
  const trimmed = val.trim()
  if (trimmed === '') return undefined

  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  // Try JSON for cells that came from snapshot JSON.stringify.
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // fall through
    }
  }

  const asNumber = Number(trimmed)
  if (!Number.isNaN(asNumber) && trimmed !== '') return asNumber

  const asDate = new Date(trimmed)
  if (!Number.isNaN(asDate.getTime()) && trimmed.includes('-') && trimmed.length >= 10) return asDate

  return val
}

function toStringCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  // Objects in XLSX cells are unusual, but keep them JSON if encountered.
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function canUpdateRow(user: { id: string; role: string }, tableId: TableId, id: string) {
  if (user.role === 'SUPER_ADMIN') return true

  const groupAdminIds = await getGroupAdminIds(user)
  const ownerAdminId = await getOwnerAdminId(user)

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

function buildRowData(row: Record<string, string>) {
  const parsed: Record<string, unknown> = {}
  Object.entries(row).forEach(([key, value]) => {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return
    parsed[key] = coerceValue(value)
  })
  return parsed
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await request.formData()
    const tableIdRaw = asNonEmptyString(form.get('tableId'))
    const requestedSheetName = asNonEmptyString(form.get('sheetName')) ?? undefined
    const file = form.get('file')

    if (!tableIdRaw || !isTableId(tableIdRaw)) {
      return NextResponse.json({ error: 'Invalid tableId' }, { status: 400 })
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const XLSX = await import('xlsx')
    const bytes = new Uint8Array(await (file as File).arrayBuffer())
    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName =
      (requestedSheetName && workbook.SheetNames.includes(requestedSheetName) && requestedSheetName) ||
      workbook.SheetNames[0] ||
      'Sheet1'
    const worksheet = workbook.Sheets[sheetName]

    if (!worksheet) {
      return NextResponse.json({ error: 'No worksheet found in file' }, { status: 400 })
    }

    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][]
    const rawHeaderRow = (aoa[0] ?? []).map((cell) => toStringCell(cell).trim())
    const headerRow = mapHeaderRow(tableIdRaw, rawHeaderRow)
    const header = headerRow.filter((cell) => cell.length > 0)

    if (header.length === 0) {
      return NextResponse.json({ error: 'Worksheet has no header row' }, { status: 400 })
    }

    const dataRows = aoa.slice(1).map((row) => row.map((cell) => toStringCell(cell)))
    const rows: Array<Record<string, string>> = []

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index] ?? []
      const obj: Record<string, string> = {}
      let hasAnyValue = false
      for (let colIndex = 0; colIndex < headerRow.length; colIndex += 1) {
        const key = headerRow[colIndex]
        if (!key) continue
        const value = row[colIndex] ?? ''
        const str = toStringCell(value)
        if (str.trim() !== '') hasAnyValue = true
        obj[key] = str
      }
      if (!hasAnyValue) continue
      rows.push(obj)
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` }, { status: 400 })
    }

    const result: ImportResult = {
      ok: true,
      tableId: tableIdRaw,
      sheetName,
      rowsTotal: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }

    const ownerAdminId = await getOwnerAdminId(user)

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]!
      const id = asNonEmptyString(row.id)

      try {
        if (id) {
          const allowed = await canUpdateRow(user, tableIdRaw, id)
          if (!allowed) {
            result.skipped += 1
            continue
          }

          const data = buildRowData(row)
          switch (tableIdRaw) {
            case 'admins':
              await db.admin.update({ where: { id }, data: data as any })
              break
            case 'customers':
              await db.customer.update({ where: { id }, data: data as any })
              break
            case 'orders':
              await db.order.update({ where: { id }, data: data as any })
              break
            case 'transactions':
              await db.transaction.update({ where: { id }, data: data as any })
              break
            case 'websites':
              await db.website.update({ where: { id }, data: data as any })
              break
            case 'menuSets':
              await db.menuSet.update({ where: { id }, data: data as any })
              break
            case 'menus':
              await db.menu.update({ where: { id }, data: data as any })
              break
            case 'dishes':
              await db.dish.update({ where: { id }, data: data as any })
              break
            case 'warehouse':
              await db.warehouseItem.update({ where: { id }, data: data as any })
              break
            case 'cookingPlans':
              await db.dailyCookingPlan.update({ where: { id }, data: data as any })
              break
            case 'actionLogs':
              await db.actionLog.update({ where: { id }, data: data as any })
              break
            case 'orderAudit':
              await db.orderAuditEvent.update({ where: { id }, data: data as any })
              break
          }
          result.updated += 1
          continue
        }

        const data = buildRowData(row)
        // Apply basic scoping defaults for new rows for middle admins.
        if (user.role !== 'SUPER_ADMIN') {
          if (tableIdRaw === 'customers' && ownerAdminId && !('createdBy' in data)) {
            data.createdBy = ownerAdminId
          }
          if (tableIdRaw === 'websites' && ownerAdminId && !('adminId' in data)) {
            data.adminId = ownerAdminId
          }
          if (tableIdRaw === 'menuSets' && ownerAdminId && !('adminId' in data)) {
            data.adminId = ownerAdminId
          }
        }

        switch (tableIdRaw) {
          case 'admins':
            await db.admin.create({ data: data as any })
            break
          case 'customers':
            await db.customer.create({ data: data as any })
            break
          case 'orders':
            await db.order.create({ data: data as any })
            break
          case 'transactions':
            await db.transaction.create({ data: data as any })
            break
          case 'websites':
            await db.website.create({ data: data as any })
            break
          case 'menuSets':
            await db.menuSet.create({ data: data as any })
            break
          case 'menus':
            await db.menu.create({ data: data as any })
            break
          case 'dishes':
            await db.dish.create({ data: data as any })
            break
          case 'warehouse':
            await db.warehouseItem.create({ data: data as any })
            break
          case 'cookingPlans':
            await db.dailyCookingPlan.create({ data: data as any })
            break
          case 'actionLogs':
            await db.actionLog.create({ data: data as any })
            break
          case 'orderAudit':
            await db.orderAuditEvent.create({ data: data as any })
            break
        }

        result.created += 1
      } catch (error) {
        result.failed += 1
        result.errors.push({
          rowIndex: index + 2, // +2 because header is row 1 and arrays are 0-based
          message: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    // eslint-disable-next-line no-console -- route diagnostics.
    console.error('Error importing XLSX sheet:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import XLSX sheet' },
      { status: 500 }
    )
  }
}
