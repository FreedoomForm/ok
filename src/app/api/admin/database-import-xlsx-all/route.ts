import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { getGroupAdminIds, getOwnerAdminId } from '@/modules/shared/auth/admin-scope'
import { mapHeaderRow, sheetNameToTableId, type TableId } from '@/lib/admin/database-xlsx-mapping'

type SheetImportResult = {
  ok: boolean
  sheetName: string
  tableId: TableId
  rowsTotal: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ rowIndex: number; message: string }>
}

type WorkbookImportResult = {
  ok: boolean
  sheetsDetected: number
  sheetsProcessed: number
  created: number
  updated: number
  skipped: number
  failed: number
  results: SheetImportResult[]
}

const MAX_IMPORT_ROWS_PER_SHEET = 2000
const MAX_IMPORT_TOTAL_ROWS = 6000

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
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { return JSON.parse(trimmed) } catch { /* fall through */ }
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
  try { return JSON.stringify(value) } catch { return String(value) }
}

async function canUpdateRow(user: { id: string; role: string }, tableId: TableId, id: string) {
  if (user.role === 'SUPER_ADMIN') return true
  const groupAdminIds = await getGroupAdminIds(user)
  const ownerAdminId = await getOwnerAdminId(user)

  switch (tableId) {
    case 'admins': { const row = await db.admin.findUnique({ where: { id }, select: { id: true, createdBy: true } }); if (!row) return false; return Boolean(groupAdminIds?.includes(row.id) || (ownerAdminId && row.createdBy === ownerAdminId)) }
    case 'customers': { const row = await db.customer.findUnique({ where: { id }, select: { id: true, createdBy: true } }); if (!row) return false; return Boolean(!groupAdminIds || (row.createdBy && groupAdminIds.includes(row.createdBy))) }
    case 'orders': { const row = await db.order.findUnique({ where: { id }, select: { id: true, adminId: true, customer: { select: { createdBy: true } } } }); if (!row) return false; if (row.adminId && groupAdminIds?.includes(row.adminId)) return true; return Boolean(row.customer?.createdBy && groupAdminIds?.includes(row.customer.createdBy)) }
    case 'transactions': { const row = await db.transaction.findUnique({ where: { id }, select: { id: true, adminId: true, customer: { select: { createdBy: true } } } }); if (!row) return false; if (row.adminId && groupAdminIds?.includes(row.adminId)) return true; return Boolean(row.customer?.createdBy && groupAdminIds?.includes(row.customer.createdBy)) }
    case 'websites': { const row = await db.website.findUnique({ where: { id }, select: { id: true, adminId: true } }); if (!row) return false; return Boolean(ownerAdminId && row.adminId === ownerAdminId) }
    case 'menuSets': { const row = await db.menuSet.findUnique({ where: { id }, select: { id: true, adminId: true } }); if (!row) return false; return Boolean(ownerAdminId && row.adminId === ownerAdminId) }
    case 'actionLogs': { const row = await db.actionLog.findUnique({ where: { id }, select: { id: true, adminId: true } }); if (!row) return false; return Boolean(row.adminId && groupAdminIds?.includes(row.adminId)) }
    case 'orderAudit': { const row = await db.orderAuditEvent.findUnique({ where: { id }, select: { id: true, order: { select: { adminId: true, customer: { select: { createdBy: true } } } } } }); if (!row) return false; if (row.order?.adminId && groupAdminIds?.includes(row.order.adminId)) return true; return Boolean(row.order?.customer?.createdBy && groupAdminIds?.includes(row.order.customer.createdBy)) }
    case 'menus': case 'dishes': case 'warehouse': case 'cookingPlans': return true
  }
}

function buildRowData(row: Record<string, string>) {
  const parsed: Record<string, unknown> = {}
  Object.entries(row).forEach(([key, value]) => { if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return; parsed[key] = coerceValue(value) })
  return parsed
}

async function updateRow(tableId: TableId, id: string, data: Record<string, unknown>) {
  const d = data as any
  switch (tableId) {
    case 'admins': await db.admin.update({ where: { id }, data: d }); return
    case 'customers': await db.customer.update({ where: { id }, data: d }); return
    case 'orders': await db.order.update({ where: { id }, data: d }); return
    case 'transactions': await db.transaction.update({ where: { id }, data: d }); return
    case 'websites': await db.website.update({ where: { id }, data: d }); return
    case 'menuSets': await db.menuSet.update({ where: { id }, data: d }); return
    case 'menus': await db.menu.update({ where: { id }, data: d }); return
    case 'dishes': await db.dish.update({ where: { id }, data: d }); return
    case 'warehouse': await db.warehouseItem.update({ where: { id }, data: d }); return
    case 'cookingPlans': await db.dailyCookingPlan.update({ where: { id }, data: d }); return
    case 'actionLogs': await db.actionLog.update({ where: { id }, data: d }); return
    case 'orderAudit': await db.orderAuditEvent.update({ where: { id }, data: d }); return
  }
}

async function createRow(tableId: TableId, data: Record<string, unknown>) {
  const d = data as any
  switch (tableId) {
    case 'admins': await db.admin.create({ data: d }); return
    case 'customers': await db.customer.create({ data: d }); return
    case 'orders': await db.order.create({ data: d }); return
    case 'transactions': await db.transaction.create({ data: d }); return
    case 'websites': await db.website.create({ data: d }); return
    case 'menuSets': await db.menuSet.create({ data: d }); return
    case 'menus': await db.menu.create({ data: d }); return
    case 'dishes': await db.dish.create({ data: d }); return
    case 'warehouse': await db.warehouseItem.create({ data: d }); return
    case 'cookingPlans': await db.dailyCookingPlan.create({ data: d }); return
    case 'actionLogs': await db.actionLog.create({ data: d }); return
    case 'orderAudit': await db.orderAuditEvent.create({ data: d }); return
  }
}

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') throw new BadRequestError('Missing file')

    const XLSX = await import('xlsx')
    const bytes = new Uint8Array(await (file as File).arrayBuffer())
    const workbook = XLSX.read(bytes, { type: 'array' })
    const ownerAdminId = await getOwnerAdminId(user)
    const results: SheetImportResult[] = []
    let totalRows = 0

    for (const sheetName of workbook.SheetNames) {
      const tableId = sheetNameToTableId(sheetName)
      if (!tableId) continue
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) continue

      const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][]
      const rawHeaderRow = (aoa[0] ?? []).map((cell) => toStringCell(cell).trim())
      const headerRow = mapHeaderRow(tableId, rawHeaderRow)
      const header = headerRow.filter((cell) => cell.length > 0)
      if (header.length === 0) continue

      const dataRows = aoa.slice(1).map((row) => row.map((cell) => toStringCell(cell)))
      const rows: Array<Record<string, string>> = []
      for (let index = 0; index < dataRows.length; index++) {
        const row = dataRows[index] ?? []
        const obj: Record<string, string> = {}
        let hasAnyValue = false
        for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
          const key = headerRow[colIndex]; if (!key) continue
          const value = row[colIndex] ?? ''; const str = toStringCell(value)
          if (str.trim() !== '') hasAnyValue = true; obj[key] = str
        }
        if (!hasAnyValue) continue; rows.push(obj)
      }

      if (rows.length > MAX_IMPORT_ROWS_PER_SHEET) throw new BadRequestError(`Too many rows in sheet "${sheetName}" (${rows.length}). Limit is ${MAX_IMPORT_ROWS_PER_SHEET}.`)
      totalRows += rows.length
      if (totalRows > MAX_IMPORT_TOTAL_ROWS) throw new BadRequestError(`Too many total rows (${totalRows}). Limit is ${MAX_IMPORT_TOTAL_ROWS}.`)

      const sheetResult: SheetImportResult = { ok: true, sheetName, tableId, rowsTotal: rows.length, created: 0, updated: 0, skipped: 0, failed: 0, errors: [] }

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index]!; const id = asNonEmptyString(row.id)
        try {
          if (id) {
            const allowed = await canUpdateRow(user, tableId, id)
            if (!allowed) { sheetResult.skipped += 1; continue }
            await updateRow(tableId, id, buildRowData(row)); sheetResult.updated += 1; continue
          }
          const data = buildRowData(row)
          if (user.role !== 'SUPER_ADMIN') {
            if (tableId === 'customers' && ownerAdminId && !('createdBy' in data)) data.createdBy = ownerAdminId
            if (tableId === 'websites' && ownerAdminId && !('adminId' in data)) data.adminId = ownerAdminId
            if (tableId === 'menuSets' && ownerAdminId && !('adminId' in data)) data.adminId = ownerAdminId
          }
          await createRow(tableId, data); sheetResult.created += 1
        } catch (error) {
          sheetResult.failed += 1; sheetResult.errors.push({ rowIndex: index + 2, message: error instanceof Error ? error.message : 'Import failed' })
        }
      }
      results.push(sheetResult)
    }

    const payload: WorkbookImportResult = {
      ok: true,
      sheetsDetected: workbook.SheetNames.length,
      sheetsProcessed: results.length,
      created: results.reduce((sum, r) => sum + r.created, 0),
      updated: results.reduce((sum, r) => sum + r.updated, 0),
      skipped: results.reduce((sum, r) => sum + r.skipped, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      results,
    }

    return { data: payload }
  },
})
