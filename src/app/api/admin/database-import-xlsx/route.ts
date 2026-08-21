import { NextRequest, NextResponse } from 'next/server'
import type { WorkBook } from 'xlsx'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { isTableId, mapHeaderRow, TableId } from '@/lib/admin/database-xlsx-mapping'
import {
  getImportFileError,
  validateImportDimensions,
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
} from '@/lib/admin/database-xlsx-import'
import {
  asNonEmptyString,
  buildRowData,
  toStringCell,
} from '@/lib/admin/database-import-row'
import { canUpdateRow } from '@/lib/admin/database-import-scope'
import { createDatabaseRow, updateDatabaseRow } from '@/lib/admin/database-row-write'

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
    const fileError = getImportFileError(file)
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 })

    const XLSX = await import('xlsx')
    let workbook: WorkBook
    try {
      const bytes = new Uint8Array(await (file as File).arrayBuffer())
      workbook = XLSX.read(bytes, { type: 'array' })
    } catch {
      return NextResponse.json({ error: 'Invalid workbook file' }, { status: 400 })
    }
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
    const dimensionsError = validateImportDimensions({
      rows: Math.max(0, aoa.length - 1),
      columns: rawHeaderRow.length,
    })
    if (dimensionsError) return NextResponse.json({ error: dimensionsError }, { status: 400 })

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

    if (rows.length > MAX_IMPORT_ROWS || rawHeaderRow.length > MAX_IMPORT_COLUMNS) {
      return NextResponse.json({ error: 'Import dimensions exceed the configured limit' }, { status: 400 })
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
          await updateDatabaseRow(db, tableIdRaw, id, data)
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

        await createDatabaseRow(db, tableIdRaw, data)

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
