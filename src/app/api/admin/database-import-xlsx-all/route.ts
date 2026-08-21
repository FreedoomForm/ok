import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { mapHeaderRow, sheetNameToTableId, TableId } from '@/lib/admin/database-xlsx-mapping'
import {
  asNonEmptyString,
  buildRowData,
  toStringCell,
} from '@/lib/admin/database-import-row'
import { canUpdateRow } from '@/lib/admin/database-import-scope'
import { createDatabaseRow, updateDatabaseRow } from '@/lib/admin/database-row-write'

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

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

      if (rows.length > MAX_IMPORT_ROWS_PER_SHEET) {
        return NextResponse.json(
          { error: `Too many rows in sheet "${sheetName}" (${rows.length}). Limit is ${MAX_IMPORT_ROWS_PER_SHEET}.` },
          { status: 400 }
        )
      }

      totalRows += rows.length
      if (totalRows > MAX_IMPORT_TOTAL_ROWS) {
        return NextResponse.json(
          { error: `Too many total rows (${totalRows}). Limit is ${MAX_IMPORT_TOTAL_ROWS}.` },
          { status: 400 }
        )
      }

      const sheetResult: SheetImportResult = {
        ok: true,
        sheetName,
        tableId,
        rowsTotal: rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]!
        const id = asNonEmptyString(row.id)

        try {
          if (id) {
            const allowed = await canUpdateRow(user, tableId, id)
            if (!allowed) {
              sheetResult.skipped += 1
              continue
            }

            const data = buildRowData(row)
            await updateDatabaseRow(db, tableId, id, data)
            sheetResult.updated += 1
            continue
          }

          const data = buildRowData(row)
          // Apply basic scoping defaults for new rows for middle admins.
          if (user.role !== 'SUPER_ADMIN') {
            if (tableId === 'customers' && ownerAdminId && !('createdBy' in data)) {
              data.createdBy = ownerAdminId
            }
            if (tableId === 'websites' && ownerAdminId && !('adminId' in data)) {
              data.adminId = ownerAdminId
            }
            if (tableId === 'menuSets' && ownerAdminId && !('adminId' in data)) {
              data.adminId = ownerAdminId
            }
          }

          await createDatabaseRow(db, tableId, data)
          sheetResult.created += 1
        } catch (error) {
          sheetResult.failed += 1
          sheetResult.errors.push({
            rowIndex: index + 2, // +2 because header is row 1 and arrays are 0-based
            message: error instanceof Error ? error.message : 'Import failed',
          })
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

    return NextResponse.json(payload)
  } catch (error) {
    // eslint-disable-next-line no-console -- route diagnostics.
    console.error('Error importing XLSX workbook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import XLSX workbook' },
      { status: 500 }
    )
  }
}

