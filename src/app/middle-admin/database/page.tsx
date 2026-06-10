'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ArrowLeft,
  CircleUser,
  Users,
  ShoppingCart,
  Receipt,
  Globe,
  Layers,
  CalendarDays,
  UtensilsCrossed,
  Warehouse,
  ChefHat,
  Activity,
  ClipboardCheck,
  Settings,
  MessageSquare,
  LogOut,
  Check,
  X,
  Database,
  Download,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Table2,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { addDays } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { SearchPanel } from '@/components/ui/search-panel'
import { getMenuNumber } from '@/modules/warehouse/infrastructure/menu-data'

type DatabaseTable = {
  id: string
  title: string
  description: string
  rowCount: number
  columns: string[]
  rows: Record<string, string>[]
}

type DatabaseSummaryRow = {
  id: string
  title: string
  description: string
  rowCount: number
  columnCount: number
}

type SnapshotPayload = {
  ok: boolean
  generatedAt: string
  scope: string
  tables: DatabaseTable[]
  summary: DatabaseSummaryRow[]
}

type ImportSheetResultPayload = {
  created?: number
  updated?: number
  skipped?: number
  failed?: number
  error?: string
}

type ImportWorkbookResultPayload = ImportSheetResultPayload & {
  sheetsProcessed?: number
}

type WorkbookLabels = {
  scope: string
  generatedAt: string
  summary: string
  sheet: string
  rows: string
  columns: string
  description: string
  defaultSheetName: string
  overflowSheetName: string
  overflowHeaderSheet: string
  overflowHeaderRow: string
  overflowHeaderColumn: string
  overflowHeaderPart: string
  overflowHeaderValue: string
  overflowValueMarker: string
  columnPrefix: string
}

const EXCEL_CELL_TEXT_LIMIT = 32767

function SheetIcon({ id, className }: { id: string; className?: string }) {
  const props = { className }
  switch (id) {
    case 'summary':
      return <Table2 {...props} />
    case 'admins':
      return <CircleUser {...props} />
    case 'customers':
      return <Users {...props} />
    case 'orders':
      return <ShoppingCart {...props} />
    case 'transactions':
      return <Receipt {...props} />
    case 'websites':
      return <Globe {...props} />
    case 'menuSets':
      return <Layers {...props} />
    case 'menus':
      return <CalendarDays {...props} />
    case 'dishes':
      return <UtensilsCrossed {...props} />
    case 'warehouse':
      return <Warehouse {...props} />
    case 'cookingPlans':
      return <ChefHat {...props} />
    case 'actionLogs':
      return <Activity {...props} />
    case 'orderAudit':
      return <ClipboardCheck {...props} />
    default:
      return <Table2 {...props} />
  }
}

type WorkbookOverflowRow = {
  sheet: string
  row: number
  column: string
  part: number
  value: string
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function sanitizeWorksheetName(name: string, usedNames: Set<string>, fallbackName = 'Sheet') {
  const cleaned = name.replace(/[\\/:?*\[\]]/g, ' ').trim() || fallbackName
  const base = cleaned.slice(0, 31)
  let candidate = base
  let counter = 2

  while (usedNames.has(candidate)) {
    const suffix = ` ${counter}`
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    counter += 1
  }

  usedNames.add(candidate)
  return candidate
}

function splitExcelText(value: string, chunkSize = EXCEL_CELL_TEXT_LIMIT) {
  if (value.length <= chunkSize) return [value]
  const chunks: string[] = []
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize))
  }
  return chunks
}

function normalizeExcelCellText(
  value: string,
  context: {
    sheet: string
    row: number
    column: string
    overflowValueMarker: string
    overflowRows: WorkbookOverflowRow[]
  }
) {
  if (value.length <= EXCEL_CELL_TEXT_LIMIT) return value

  const chunks = splitExcelText(value, EXCEL_CELL_TEXT_LIMIT)
  chunks.forEach((chunk, index) => {
    context.overflowRows.push({
      sheet: context.sheet,
      row: context.row,
      column: context.column,
      part: index + 1,
      value: chunk,
    })
  })

  const marker = ` ...[${context.overflowValueMarker}]`
  const previewLimit = Math.max(0, Math.min(1200, EXCEL_CELL_TEXT_LIMIT - marker.length))
  return `${value.slice(0, previewLimit)}${marker}`
}

function buildWorkbookSheets(
  snapshot: SnapshotPayload,
  labels: WorkbookLabels,
  columnLabeler: (column: string) => string = (value) => value
) {
  const summaryRows = [
    [labels.scope, snapshot.scope],
    [labels.generatedAt, snapshot.generatedAt],
    [],
    [labels.sheet, labels.rows, labels.columns, labels.description],
    ...snapshot.summary.map((item) => [item.title, String(item.rowCount), String(item.columnCount), item.description]),
  ]

  const tableSheets: Array<{ name: string; rows: string[][] }> = snapshot.tables.map((table) => ({
    name: table.title,
    rows: [
      table.columns.map((column) => columnLabeler(column)),
      ...table.rows.map((row) => table.columns.map((column) => row[column] ?? '')),
    ],
  }))

  const workbookSheets: Array<{ name: string; rows: string[][] }> = [
    { name: labels.summary, rows: summaryRows.map((row) => row.map((value) => String(value ?? ''))) },
    ...tableSheets,
  ]

  return workbookSheets
}

async function downloadWorkbookXlsx(
  fileName: string,
  snapshot: SnapshotPayload,
  labels: WorkbookLabels,
  columnLabeler: (column: string) => string = (value) => value
) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const usedSheetNames = new Set<string>()
  const overflowRows: WorkbookOverflowRow[] = []
  const workbookSheets = buildWorkbookSheets(snapshot, labels, columnLabeler)

  workbookSheets.forEach((sheet) => {
    const sheetName = sanitizeWorksheetName(sheet.name, usedSheetNames, labels.defaultSheetName)
    const headerRow = sheet.rows[0] ?? []
    const normalizedRows = sheet.rows.map((row, rowIndex) =>
      row.map((cell, columnIndex) => {
        const columnName =
          rowIndex > 0
            ? (headerRow[columnIndex] ?? `${labels.columnPrefix}_${columnIndex + 1}`)
            : `${labels.columnPrefix}_${columnIndex + 1}`
        return normalizeExcelCellText(String(cell ?? ''), {
          sheet: sheetName,
          row: rowIndex + 1,
          column: String(columnName),
          overflowValueMarker: labels.overflowValueMarker,
          overflowRows,
        })
      })
    )
    const worksheet = XLSX.utils.aoa_to_sheet(normalizedRows)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  })

  if (overflowRows.length > 0) {
    const overflowSheetName = sanitizeWorksheetName(labels.overflowSheetName, usedSheetNames, labels.defaultSheetName)
    const overflowWorksheet = XLSX.utils.aoa_to_sheet([
      [
        labels.overflowHeaderSheet,
        labels.overflowHeaderRow,
        labels.overflowHeaderColumn,
        labels.overflowHeaderPart,
        labels.overflowHeaderValue,
      ],
      ...overflowRows.map((item) => [
        item.sheet,
        String(item.row),
        item.column,
        String(item.part),
        item.value,
      ]),
    ])
    XLSX.utils.book_append_sheet(workbook, overflowWorksheet, overflowSheetName)
  }

  try {
    const fileArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true })
    downloadBlob(
      fileName,
      new Blob([fileArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    )
  } catch {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', compression: true })
  }
}

async function downloadSingleTableXlsx(
  fileName: string,
  table: DatabaseTable,
  labels: WorkbookLabels,
  columnLabeler: (column: string) => string = (value) => value
) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const overflowRows: WorkbookOverflowRow[] = []
  const sheetName = sanitizeWorksheetName(table.title, new Set<string>(), labels.defaultSheetName)
  const worksheetRows = [
    table.columns.map((column) => columnLabeler(column)),
    ...table.rows.map((row) => table.columns.map((column) => row[column] ?? '')),
  ]
  const headerRow = worksheetRows[0] ?? []
  const normalizedRows = worksheetRows.map((row, rowIndex) =>
    row.map((cell, columnIndex) =>
      normalizeExcelCellText(String(cell ?? ''), {
        sheet: sheetName,
        row: rowIndex + 1,
        column: String(headerRow[columnIndex] ?? `${labels.columnPrefix}_${columnIndex + 1}`),
        overflowValueMarker: labels.overflowValueMarker,
        overflowRows,
      })
    )
  )
  const worksheet = XLSX.utils.aoa_to_sheet(normalizedRows)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  if (overflowRows.length > 0) {
    const overflowWorksheet = XLSX.utils.aoa_to_sheet([
      [
        labels.overflowHeaderSheet,
        labels.overflowHeaderRow,
        labels.overflowHeaderColumn,
        labels.overflowHeaderPart,
        labels.overflowHeaderValue,
      ],
      ...overflowRows.map((item) => [
        item.sheet,
        String(item.row),
        item.column,
        String(item.part),
        item.value,
      ]),
    ])
    XLSX.utils.book_append_sheet(
      workbook,
      overflowWorksheet,
      sanitizeWorksheetName(labels.overflowSheetName, new Set([sheetName]), labels.defaultSheetName)
    )
  }

  try {
    const fileArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true })
    downloadBlob(
      fileName,
      new Blob([fileArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    )
  } catch {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', compression: true })
  }
}

export default function DatabasePage() {
  const { language } = useLanguage()
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/', redirect: true })
  }, [])

  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [searchTerm, setSearchTerm] = useState('')
  const [date, setDate] = useState<DateRange | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [draftRow, setDraftRow] = useState<Record<string, string> | null>(null)
  const [draftRowTableId, setDraftRowTableId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const allSheetsFileInputRef = useRef<HTMLInputElement>(null)
  const [importTargetTableId, setImportTargetTableId] = useState<string | null>(null)
  const [isImportingSheet, setIsImportingSheet] = useState(false)
  const [isImportingAllSheets, setIsImportingAllSheets] = useState(false)

  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingRowData, setEditingRowData] = useState<Record<string, string> | null>(null)
  const [tableQuery, setTableQuery] = useState('')
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50)
  const [pageIndex, setPageIndex] = useState(0)

  const menuChip = useMemo(() => {
    if (!date?.from) return 'Menu'
    const fromNum = getMenuNumber(date.from)
    const toNum = getMenuNumber(date.to ?? date.from)
    return fromNum === toNum ? `Menu ${fromNum}` : `Menu ${fromNum}-${toNum}`
  }, [date?.from, date?.to])

  const uiText = useMemo(() => {
    if (language === 'ru') {
      return {
        accessDeniedWorkspace: 'Доступ к рабочей области базы данных Neon запрещен',
        failedLoadSnapshot: 'Не удалось загрузить снимок базы данных Neon',
        unableLoadSnapshot: 'Не удалось загрузить базу данных Neon',
        notSyncedYet: 'Еще не синхронизировано',
        workbookDownloaded: 'Excel-файл со всеми листами скачан',
        fullSheetDownloaded: 'Полный лист выгружен в Excel',
        failedDownloadWorkbook: 'Не удалось скачать книгу',
        failedDownloadSheet: 'Не удалось скачать лист',
        workspaceTitle: 'Рабочая область Neon DB',
        unknownScope: 'Неизвестно',
        workspaceDescription: (scope: string, lastSync: string) =>
          `Реальные таблицы Prisma из Neon. Область: ${scope}. Последняя синхронизация: ${lastSync}.`,
        loadingWorkspace: 'Загрузка рабочей области базы данных Neon...',
        backToMiddleAdmin: 'Назад к среднему администратору',
        sheetsCount: 'листов',
        refresh: 'Обновить',
        downloadAllSheets: 'Скачать все листы',
        visibleSheets: 'Видимые листы',
        totalRows: 'Всего строк',
        totalColumns: 'Всего колонок',
        calendar: 'Календарь',
        allTime: 'За все время',
        today: 'Сегодня',
        thisWeek: 'Эта неделя',
        thisMonth: 'Этот месяц',
        clearRange: 'Сбросить',
        database: 'База данных',
        scope: 'Область',
        generatedAt: 'Сформировано',
        summary: 'Сводка',
        allNeonSheets: 'Все листы Neon',
        allNeonSheetsDescription: 'Фактические таблицы базы данных, доступные в вашей области доступа.',
        sheet: 'Лист',
        rows: 'Строки',
        columns: 'Колонки',
        description: 'Описание',
        searchInTable: (title: string) => `Поиск в ${title}`,
        rowsCount: 'строк',
        downloadSheet: 'Скачать лист',
        noRowsMatch: 'Нет строк, подходящих под поиск.',
        defaultSheetName: 'Лист',
        overflowSheetName: 'Переполнение',
        overflowHeaderSheet: 'Лист',
        overflowHeaderRow: 'Строка',
        overflowHeaderColumn: 'Колонка',
        overflowHeaderPart: 'Часть',
        overflowHeaderValue: 'Значение',
        overflowValueMarker: 'ПОЛНОЕ_ЗНАЧЕНИЕ_В_ЛИСТЕ_ПЕРЕПОЛНЕНИЯ',
        columnPrefix: 'колонка',
        addRow: 'Добавить строку',
        saveRow: 'Сохранить',
        cancelRow: 'Отмена',
        rowSaved: 'Строка сохранена',
        rowSaveFailed: 'Ошибка сохранения строки',
        editRow: 'Редактировать',
        saveEdit: 'Сохранить изменения',
        cancelEdit: 'Отмена',
        importSheet: 'Импорт / Обновить XLSX',
        importingSheet: 'Импорт...',
        importSheetSuccess: (created: number, updated: number, skipped: number, failed: number) =>
          `Импорт завершен. Создано: ${created}, обновлено: ${updated}, пропущено: ${skipped}, ошибок: ${failed}.`,
        importSheetFailed: 'Не удалось импортировать XLSX',
        importAllSheets: 'Импорт / обновить все листы (XLSX)',
        importingAllSheets: 'Импорт всех листов...',
        importAllSheetsSuccess: (sheets: number, created: number, updated: number, skipped: number, failed: number) =>
          `Импорт книги завершен. Листов: ${sheets}. Создано: ${created}, обновлено: ${updated}, пропущено: ${skipped}, ошибок: ${failed}.`,
        importAllSheetsFailed: 'Не удалось импортировать XLSX книгу',
        tablesNavTitle: 'Таблицы',
        searchTables: 'Поиск таблиц…',
        rowsPerPage: 'Строк на странице',
        rowsRange: (from: number, to: number, total: number) => `Строки ${from}–${to} из ${total}`,
        previous: 'Назад',
        next: 'Вперед',
        autoGenerated: 'Авто',
        autoTimed: 'Авто',
        enterValue: (column: string) => `Введите ${column}...`,
      }
    }

    if (language === 'uz') {
      return {
        accessDeniedWorkspace: 'Neon maʼlumotlar bazasi ish maydoniga kirish taqiqlangan',
        failedLoadSnapshot: 'Neon maʼlumotlar bazasi snapshotini yuklab bo‘lmadi',
        unableLoadSnapshot: 'Neon maʼlumotlar bazasini yuklab bo‘lmadi',
        notSyncedYet: 'Hali sinxronlanmagan',
        workbookDownloaded: 'Barcha sahifalar bilan Excel fayl yuklab olindi',
        fullSheetDownloaded: 'To‘liq sahifa Excelga yuklab olindi',
        failedDownloadWorkbook: 'Excel kitobini yuklab bo‘lmadi',
        failedDownloadSheet: 'Sahifani yuklab bo‘lmadi',
        workspaceTitle: 'Neon DB ish maydoni',
        unknownScope: 'Nomaʼlum',
        workspaceDescription: (scope: string, lastSync: string) =>
          `Neon’dagi haqiqiy Prisma jadvallari. Qamrov: ${scope}. Oxirgi sinxronlash: ${lastSync}.`,
        loadingWorkspace: 'Neon maʼlumotlar bazasi ish maydoni yuklanmoqda...',
        backToMiddleAdmin: 'O‘rta administratorga qaytish',
        sheetsCount: 'sahifa',
        refresh: 'Yangilash',
        downloadAllSheets: 'Barcha sahifalarni yuklash',
        visibleSheets: 'Ko‘rinadigan sahifalar',
        totalRows: 'Jami qatorlar',
        totalColumns: 'Jami ustunlar',
        calendar: 'Kalendar',
        allTime: 'Barcha vaqt',
        today: 'Bugun',
        thisWeek: 'Shu hafta',
        thisMonth: 'Shu oy',
        clearRange: 'Tozalash',
      database: 'Maʼlumotlar bazasi',
      scope: 'Qamrov',
      generatedAt: 'Yaratilgan vaqti',
      summary: 'Umumiy',
        allNeonSheets: 'Barcha Neon sahifalari',
        allNeonSheetsDescription: 'Sizga ruxsat etilgan qamrovdagi haqiqiy maʼlumotlar bazasi jadvallari.',
        sheet: 'Sahifa',
        rows: 'Qatorlar',
        columns: 'Ustunlar',
        description: 'Tavsif',
        searchInTable: (title: string) => `${title} ichida qidirish`,
        rowsCount: 'qator',
        downloadSheet: 'Sahifani yuklash',
        noRowsMatch: 'Qidiruvga mos qator topilmadi.',
        defaultSheetName: 'Sahifa',
        overflowSheetName: 'Toshib ketgan qiymatlar',
        overflowHeaderSheet: 'Sahifa',
        overflowHeaderRow: 'Qator',
        overflowHeaderColumn: 'Ustun',
        overflowHeaderPart: 'Qism',
        overflowHeaderValue: 'Qiymat',
        overflowValueMarker: 'TOʻLIQ_QIYMAT_TOSHISH_SAHIFASIDA',
        columnPrefix: 'ustun',
        addRow: 'Qator qo\'shish',
        saveRow: 'Saqlash',
        cancelRow: 'Bekor qilish',
        rowSaved: 'Qator saqlandi',
        rowSaveFailed: 'Qatorni saqlashda xatolik',
        editRow: 'Tahrirlash',
        saveEdit: 'O\'zgarishlarni saqlash',
        cancelEdit: 'Bekor qilish',
        importSheet: 'XLSX import / yangilash',
        importingSheet: 'Import...',
        importSheetSuccess: (created: number, updated: number, skipped: number, failed: number) =>
          `Import tugadi. Yaratildi: ${created}, yangilandi: ${updated}, o‘tkazildi: ${skipped}, xatolar: ${failed}.`,
        importSheetFailed: 'XLSX import qilib bo‘lmadi',
        importAllSheets: 'XLSX import / yangilash (barcha sahifalar)',
        importingAllSheets: 'Barcha sahifalar import...',
        importAllSheetsSuccess: (sheets: number, created: number, updated: number, skipped: number, failed: number) =>
          `Excel import tugadi. Sahifalar: ${sheets}. Yaratildi: ${created}, yangilandi: ${updated}, o‘tkazildi: ${skipped}, xatolar: ${failed}.`,
        importAllSheetsFailed: 'Excel faylni import qilib bo‘lmadi',
        tablesNavTitle: 'Jadvallar',
        searchTables: 'Jadval qidirish…',
        rowsPerPage: 'Sahifadagi qatorlar',
        rowsRange: (from: number, to: number, total: number) => `Qatorlar ${from}–${to} / ${total}`,
        previous: 'Oldingi',
        next: 'Keyingi',
        autoGenerated: 'Avto',
        autoTimed: 'Avto',
        enterValue: (column: string) => `${column} kiriting...`,
      }
    }

    return {
      accessDeniedWorkspace: 'Access denied for Neon database workspace',
      failedLoadSnapshot: 'Failed to load Neon database snapshot',
      unableLoadSnapshot: 'Unable to load Neon database',
      notSyncedYet: 'Not synced yet',
      workbookDownloaded: 'Excel workbook downloaded with separate sheets',
      fullSheetDownloaded: 'Full sheet downloaded as Excel',
      failedDownloadWorkbook: 'Failed to download workbook',
      failedDownloadSheet: 'Failed to download sheet',
      workspaceTitle: 'Neon DB workspace',
      unknownScope: 'Unknown',
      workspaceDescription: (scope: string, lastSync: string) =>
        `Real Prisma tables from Neon. Scope: ${scope}. Last sync: ${lastSync}.`,
      loadingWorkspace: 'Loading Neon database workspace...',
      backToMiddleAdmin: 'Back to middle admin',
      sheetsCount: 'sheets',
      refresh: 'Refresh',
      downloadAllSheets: 'Download all sheets',
      visibleSheets: 'Visible sheets',
      totalRows: 'Total rows',
      totalColumns: 'Total columns',
      calendar: 'Calendar',
      allTime: 'All time',
      today: 'Today',
      thisWeek: 'This week',
      thisMonth: 'This month',
      clearRange: 'Clear',
      database: 'Database',
      scope: 'Scope',
      generatedAt: 'Generated At',
      summary: 'Summary',
      allNeonSheets: 'All Neon sheets',
      allNeonSheetsDescription: 'Actual database tables available in your current access scope.',
      sheet: 'Sheet',
      rows: 'Rows',
      columns: 'Columns',
      description: 'Description',
      searchInTable: (title: string) => `Search ${title}`,
      rowsCount: 'rows',
      downloadSheet: 'Download sheet',
      noRowsMatch: 'No rows match this search.',
      defaultSheetName: 'Sheet',
      overflowSheetName: 'Overflow',
      overflowHeaderSheet: 'Sheet',
      overflowHeaderRow: 'Row',
      overflowHeaderColumn: 'Column',
      overflowHeaderPart: 'Part',
      overflowHeaderValue: 'Value',
      overflowValueMarker: 'FULL_VALUE_IN_OVERFLOW_SHEET',
      columnPrefix: 'column',
      addRow: 'Add Row',
      saveRow: 'Save',
      cancelRow: 'Cancel',
      rowSaved: 'Row saved',
      rowSaveFailed: 'Failed to save row',
      editRow: 'Edit',
      saveEdit: 'Save changes',
      cancelEdit: 'Cancel',
      importSheet: 'Import / Update XLSX',
      importingSheet: 'Importing...',
      importSheetSuccess: (created: number, updated: number, skipped: number, failed: number) =>
        `Import complete. Created: ${created}, updated: ${updated}, skipped: ${skipped}, failed: ${failed}.`,
      importSheetFailed: 'Failed to import XLSX',
      importAllSheets: 'Import / Update all sheets (XLSX)',
      importingAllSheets: 'Importing all sheets...',
      importAllSheetsSuccess: (sheets: number, created: number, updated: number, skipped: number, failed: number) =>
        `Workbook import complete. Sheets: ${sheets}. Created: ${created}, updated: ${updated}, skipped: ${skipped}, failed: ${failed}.`,
      importAllSheetsFailed: 'Failed to import XLSX workbook',
      tablesNavTitle: 'Tables',
      searchTables: 'Search tables…',
      rowsPerPage: 'Rows per page',
      rowsRange: (from: number, to: number, total: number) => `Rows ${from}–${to} of ${total}`,
      previous: 'Previous',
      next: 'Next',
      autoGenerated: 'Auto',
      autoTimed: 'Auto',
      enterValue: (column: string) => `Enter ${column}...`,
    }
  }, [language])

  const humanizeKey = useCallback((input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return input
    const spaced = trimmed
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }, [])

  const tDb = useCallback((key: string) => {
    const dbDict: Record<string, Record<string, string>> = {
      ru: {
        'Admins': 'Админы',
        'Customers': 'Клиенты',
        'Orders': 'Заказы',
        'Transactions': 'Транзакции',
        'Websites': 'Сайты',
        'Menu Sets': 'Сеты Меню',
        'Menus': 'Меню',
        'Dishes': 'Блюда',
        'Warehouse': 'Склад',
        'Cooking Plans': 'Планы Готовки',
        'Action Logs': 'Логи',
        'Order Audit': 'Аудит',
        'id': 'ID',
        'name': 'имя',
        'title': 'название',
        'subtitle': 'подзаголовок',
        'createdAt': 'создано',
        'updatedAt': 'обновлено',
        'createdBy': 'создал',
        'adminId': 'админ ID',
        'ownerAdminId': 'владелец ID',
        'status': 'статус',
        'isOnShift': 'на смене',
        'role': 'роль',
        'price': 'цена',
        'email': 'email',
        'salary': 'зарплата',
        'isActive': 'активен',
        'phone': 'телефон',
        'address': 'адрес',
        'subdomain': 'субдомен',
        'theme': 'тема',
        'content': 'контент',
        'chatEnabled': 'чат включен',
        'calories': 'калории',
        'nickName': 'никнейм',
        'specialFeatures': 'особые пожелания',
        'paymentStatus': 'статус оплаты',
        'paymentMethod': 'способ оплаты',
        'isPrepaid': 'предоплата',
        'dailyPrice': 'цена за день',
        'amount': 'количество',
        'description': 'описание',
        'type': 'тип',
        'quantity': 'количество',
        'date': 'дата',
        'deliveryAddress': 'адрес доставки',
        'deliveryTime': 'время доставки',
        'deliveryDate': 'дата доставки',
        'orderNumber': 'номер заказа',
        'orderStatus': 'статус заказа',
        'customerId': 'клиент ID',
        'courierId': 'курьер ID',
        'notes': 'примечания',
        'deletedAt': 'удалено',
        'menuNumber': 'номер меню',
        'calorieGroups': 'калорийные группы',
        'groups': 'группы',
        'ingredients': 'ингредиенты',
        'imageUrl': 'изображение',
        'calorieMappings': 'сопоставления калорий',
        'amountReceived': 'получено',
        'category': 'категория',
        'entityType': 'тип сущности',
        'entityId': 'сущность ID',
        'oldValues': 'старые значения',
        'newValues': 'новые значения',
        'details': 'детали',
        'eventType': 'тип события',
        'actorName': 'исполнитель',
        'actorRole': 'роль исполнителя',
        'previousStatus': 'предыдущий статус',
        'nextStatus': 'следующий статус',
        'payload': 'данные',
        'message': 'сообщение',
        'occurredAt': 'время',
        'dayOfWeek': 'день недели',
        'mealType': 'прием пищи',
        'expectedCalories': 'ожидаемые калории',
        'totalPrice': 'общая сумма',
        'preferences': 'настройки',
        'orderPattern': 'шаблон заказа',
        'password': 'пароль',
        'deletedBy': 'удалил',
        'defaultCourierId': 'курьер по умолчанию ID',
        'planType': 'тип плана',
        'deliveryDays': 'дни доставки',
        'autoOrdersEnabled': 'авто заказы включены',
        'balance': 'баланс',
        'assignedSetId': 'назначенный set ID',
        'latitude': 'широта',
        'longitude': 'долгота',
        'priority': 'приоритет',
        'sourceChannel': 'канал источника',
        'statusChangedAt': 'статус изменен',
        'assignedAt': 'назначено',
        'pickedUpAt': 'забрано',
        'pausedAt': 'приостановлено',
        'resumedAt': 'возобновлено',
        'deliveredAt': 'доставлено',
        'failedAt': 'не удалось',
        'canceledAt': 'отменено',
        'confirmedAt': 'подтверждено',
        'etaMinutes': 'ETA минут',
        'routeDistanceKm': 'расстояние (км)',
        'routeDurationMin': 'длительность (мин)',
        'sequenceInRoute': 'порядок в маршруте',
        'customerRating': 'оценка клиента',
        'customerFeedback': 'отзыв клиента',
        'lastLatitude': 'последняя широта',
        'lastLongitude': 'последняя долгота',
        'lastLocationAt': 'последняя геолокация',
        'orderType': 'тип заказа',
        'fromAutoOrder': 'из авто заказа',
        'trialEndsAt': 'окончание пробного периода',
        'allowedTabs': 'разрешенные вкладки',
        'googleId': 'Google ID',
        'hasPassword': 'есть пароль',
        'transportType': 'тип транспорта',
        'vehicleNumber': 'номер машины',
        'maxLoad': 'макс груз',
        'shiftStartedAt': 'смена началась',
        'shiftEndedAt': 'смена закончилась',
        'lastSeenAt': 'последний визит',
        'averageDeliveryMinutes': 'ср. доставка (мин)',
        'companyBalance': 'баланс компании',
      },
      uz: {
        'Admins': 'Adminlar',
        'Customers': 'Mijozlar',
        'Orders': 'Buyurtmalar',
        'Transactions': 'Tranzaksiyalar',
        'Websites': 'Saytlar',
        'Menu Sets': 'Menyu setlari',
        'Menus': 'Menyular',
        'Dishes': 'Taomlar',
        'Warehouse': 'Ombor',
        'Cooking Plans': 'Pishirish Rejalari',
        'Action Logs': 'Loglar',
        'Order Audit': 'Audit',
        'id': 'ID',
        'name': 'ism',
        'title': 'nomi',
        'subtitle': 'taglavha',
        'createdAt': 'yaratilgan',
        'updatedAt': 'yangilangan',
        'createdBy': 'yaratgan',
        'adminId': 'admin ID',
        'ownerAdminId': 'egasi ID',
        'status': 'holat',
        'isOnShift': 'smenada',
        'role': 'rol',
        'price': 'narxi',
        'email': 'email',
        'salary': 'maosh',
        'isActive': 'faol',
        'phone': 'telefon',
        'address': 'manzil',
        'calories': 'kaloriya',
        'nickName': 'laqab',
        'specialFeatures': 'maxsus istak',
        'paymentStatus': 'to\'lov holati',
        'paymentMethod': 'to\'lov usuli',
        'isPrepaid': 'oldindan to\'lov',
        'dailyPrice': 'kunlik narx',
        'amount': 'miqdor',
        'description': 'tavsif',
        'type': 'tur',
        'quantity': 'miqdor',
        'date': 'sana',
        'deliveryAddress': 'yetkazish manzili',
        'deliveryTime': 'yetkazish vaqti',
        'deliveryDate': 'yetkazish sanasi',
        'orderNumber': 'buyurtma raqami',
        'orderStatus': 'buyurtma holati',
        'customerId': 'mijoz ID',
        'courierId': 'kuryer ID',
        'notes': 'izohlar',
        'deletedAt': 'o\'chirilgan',
        'subdomain': 'subdomen',
        'theme': 'mavzu',
        'content': 'kontent',
        'chatEnabled': 'chat yoqilgan',
        'menuNumber': 'menyu raqami',
        'calorieGroups': 'guruhlar',
        'groups': 'guruhlar',
        'ingredients': 'ingredientlar',
        'imageUrl': 'rasm',
        'calorieMappings': 'kaloriya moslash',
        'amountReceived': 'qabul qilingan',
        'category': 'kategoriya',
        'entityType': 'obyekt turi',
        'entityId': 'obyekt ID',
        'oldValues': 'eski qiymatlar',
        'newValues': 'yangi qiymatlar',
        'details': 'detallar',
        'eventType': 'hodisa turi',
        'actorName': 'bajaruvchi',
        'actorRole': 'bajaruvchi roli',
        'previousStatus': 'oldingi holat',
        'nextStatus': 'keyingi holat',
        'payload': 'ma\'lumotlar',
        'message': 'xabar',
        'occurredAt': 'vaqt',
        'dayOfWeek': 'hafta kuni',
        'mealType': 'ovqatlanish turi',
        'expectedCalories': 'kutilayotgan kaloriyalar',
        'totalPrice': 'umumiy narx',
        'preferences': 'Preferences',
        'orderPattern': 'Order Pattern',
        'password': 'Password',
        'deletedBy': 'Deleted By',
        'defaultCourierId': 'Default Courier Id',
        'planType': 'Plan Type',
        'deliveryDays': 'Delivery Days',
        'autoOrdersEnabled': 'Auto Orders Enabled',
        'balance': 'Balance',
        'assignedSetId': 'Assigned Set Id',
        'latitude': 'Latitude',
        'longitude': 'Longitude',
        'priority': 'Priority',
        'sourceChannel': 'Source Channel',
        'statusChangedAt': 'Status Changed At',
        'assignedAt': 'Assigned At',
        'pickedUpAt': 'Picked Up At',
        'pausedAt': 'Paused At',
        'resumedAt': 'Resumed At',
        'deliveredAt': 'Delivered At',
        'failedAt': 'Failed At',
        'canceledAt': 'Canceled At',
        'confirmedAt': 'Confirmed At',
        'etaMinutes': 'Eta Minutes',
        'routeDistanceKm': 'Route Distance Km',
        'routeDurationMin': 'Route Duration Min',
        'sequenceInRoute': 'Sequence In Route',
        'customerRating': 'Customer Rating',
        'customerFeedback': 'Customer Feedback',
        'lastLatitude': 'Last Latitude',
        'lastLongitude': 'Last Longitude',
        'lastLocationAt': 'Last Location At',
        'orderType': 'Order Type',
        'fromAutoOrder': 'From Auto Order',
        'trialEndsAt': 'Trial Ends At',
        'allowedTabs': 'Allowed Tabs',
        'googleId': 'Google Id',
        'hasPassword': 'Has Password',
        'transportType': 'Transport Type',
        'vehicleNumber': 'Vehicle Number',
        'maxLoad': 'Max Load',
        'shiftStartedAt': 'Shift Started At',
        'shiftEndedAt': 'Shift Ended At',
        'lastSeenAt': 'Last Seen At',
        'averageDeliveryMinutes': 'Average Delivery Minutes',
        'companyBalance': 'Company Balance',
      }
    }
    return dbDict[language as string]?.[key] || humanizeKey(key)
  }, [humanizeKey, language])

  const tDbValue = useCallback((value: string) => {
    if (value === 'null' || value === '' || value === '""' || value === '{}' || value === '[]') return '-'
    if (value === 'true') return language === 'ru' ? 'да' : 'ha'
    if (value === 'false') return language === 'ru' ? 'нет' : 'yoq'
    
    // Statuses
    const statusDict: Record<string, Record<string, string>> = {
      ru: {
        'ACTIVE': 'АКТИВЕН',
        'INACTIVE': 'НЕАКТИВЕН',
        'PAUSED': 'ПРИОСТАНОВЛЕН',
        'PENDING': 'В ОЖИДАНИИ',
        'DELIVERED': 'ДОСТАВЛЕН',
        'CANCELLED': 'ОТМЕНЕН',
        'COMPLETED': 'ЗАВЕРШЕН',
        'SUPER_ADMIN': 'СУПЕР АДМИН',
        'MIDDLE_ADMIN': 'СРЕДНИЙ АДМИН',
        'LOW_ADMIN': 'МЛАДШИЙ АДМИН',
        'COURIER': 'КУРЬЕР',
        'WORKER': 'РАБОТНИК',
      },
      uz: {
        'ACTIVE': 'FAOL',
        'INACTIVE': 'NOFAOL',
        'PAUSED': 'TO\'XTATILGAN',
        'PENDING': 'KUTILMOQDA',
        'DELIVERED': 'YETKAZILGAN',
        'CANCELLED': 'BEKOR QILINGAN',
        'COMPLETED': 'YAKUNLANGAN',
        'SUPER_ADMIN': 'SUPER ADMIN',
        'MIDDLE_ADMIN': 'O\'RTA ADMIN',
        'LOW_ADMIN': 'KICHIK ADMIN',
        'COURIER': 'KURYER',
        'WORKER': 'ISHCHI',
      }
    }

    // Attempt to parse JSON objects to make them readable
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        if (Object.keys(parsed).length === 0) return '-'
        return JSON.stringify(parsed, null, 2).replace(/[{}[\]"]/g, '').split('\n').map(line => line.trim()).filter(Boolean).join(', ')
      } catch {
        return value
      }
    }

    return statusDict[language as string]?.[value] || value
  }, [language])

  const loadSnapshot = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      let url = '/api/admin/database-snapshot'
      if (date?.from && date?.to) {
        url += `?start=${date.from.toISOString()}&end=${addDays(date.to, 1).toISOString()}`
      } else if (date?.from) {
        url += `?start=${date.from.toISOString()}&end=${addDays(date.from, 1).toISOString()}`
      }
      const response = await fetch(url, { cache: 'no-store' })

      if (response.status === 401) {
        router.replace('/login')
        return
      }

      if (response.status === 403) {
        toast.error(uiText.accessDeniedWorkspace)
        return
      }

      const data = (await response.json().catch(() => null)) as SnapshotPayload | null
      if (!response.ok || !data) {
        throw new Error(uiText.failedLoadSnapshot)
      }

      setSnapshot(data)
      setActiveTab((currentTab) =>
        currentTab === 'summary' || data.tables.some((table) => table.id === currentTab)
          ? currentTab
          : 'summary'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : uiText.unableLoadSnapshot)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [router, uiText.accessDeniedWorkspace, uiText.failedLoadSnapshot, uiText.unableLoadSnapshot, date])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    setSearchTerm('')
    setDraftRow(null)
    setDraftRowTableId(null)
    setEditingRowId(null)
    setEditingRowData(null)
  }, [activeTab])

  useEffect(() => {
    setPageIndex(0)
  }, [activeTab, pageSize, searchTerm])

  const tables = useMemo(() => snapshot?.tables ?? [], [snapshot?.tables])
  const summary = useMemo(() => snapshot?.summary ?? [], [snapshot?.summary])
  const totalRows = useMemo(() => summary.reduce((sum, item) => sum + item.rowCount, 0), [summary])
  const totalColumns = useMemo(() => summary.reduce((sum, item) => sum + item.columnCount, 0), [summary])
  const lastSyncedLabel = useMemo(() => {
    if (!snapshot?.generatedAt) return uiText.notSyncedYet
    return new Date(snapshot.generatedAt).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [snapshot?.generatedAt, uiText.notSyncedYet])

  const currentTable = useMemo(
    () => tables.find((table) => table.id === activeTab) ?? null,
    [activeTab, tables]
  )

  const visibleTables = useMemo(() => {
    const query = tableQuery.trim().toLowerCase()
    if (!query) return tables

    const filtered = tables.filter((table) => {
      const haystack = `${table.id} ${table.title} ${tDb(table.title)} ${table.description ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })

    if (activeTab !== 'summary') {
      const active = tables.find((table) => table.id === activeTab)
      if (active && !filtered.some((table) => table.id === active.id)) {
        return [active, ...filtered]
      }
    }

    return filtered
  }, [activeTab, tableQuery, tables, tDb])

  const handleImportSheetClick = useCallback((tableId: string) => {
    setImportTargetTableId(tableId)
    fileInputRef.current?.click()
  }, [])

  const handleImportAllSheetsClick = useCallback(() => {
    allSheetsFileInputRef.current?.click()
  }, [])

  const handleImportFileChosen = useCallback(
    async (file: File | null) => {
      if (!file || !importTargetTableId) return

      setIsImportingSheet(true)
      try {
        const table = tables.find((item) => item.id === importTargetTableId) ?? null
        const formData = new FormData()
        formData.append('tableId', importTargetTableId)
        if (table?.title) formData.append('sheetName', table.title)
        formData.append('file', file)

        const response = await fetch('/api/admin/database-import-xlsx', {
          method: 'POST',
          body: formData,
        })
        const data = (await response.json().catch(() => null)) as ImportSheetResultPayload | null

        if (!response.ok) {
          throw new Error(data?.error || uiText.importSheetFailed)
        }

        toast.success(
          uiText.importSheetSuccess(
            Number(data?.created ?? 0),
            Number(data?.updated ?? 0),
            Number(data?.skipped ?? 0),
            Number(data?.failed ?? 0)
          )
        )
        void loadSnapshot(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : uiText.importSheetFailed)
      } finally {
        setIsImportingSheet(false)
        setImportTargetTableId(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [importTargetTableId, loadSnapshot, tables, uiText]
  )

  const handleImportAllSheetsFileChosen = useCallback(
    async (file: File | null) => {
      if (!file) return

      setIsImportingAllSheets(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/admin/database-import-xlsx-all', {
          method: 'POST',
          body: formData,
        })
        const data = (await response.json().catch(() => null)) as ImportWorkbookResultPayload | null

        if (!response.ok) {
          throw new Error(data?.error || uiText.importAllSheetsFailed)
        }

        toast.success(
          uiText.importAllSheetsSuccess(
            Number(data?.sheetsProcessed ?? 0),
            Number(data?.created ?? 0),
            Number(data?.updated ?? 0),
            Number(data?.skipped ?? 0),
            Number(data?.failed ?? 0)
          )
        )
        void loadSnapshot(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : uiText.importAllSheetsFailed)
      } finally {
        setIsImportingAllSheets(false)
        if (allSheetsFileInputRef.current) allSheetsFileInputRef.current.value = ''
      }
    },
    [loadSnapshot, uiText]
  )

  const filteredRows = useMemo(() => {
    if (!currentTable) return []
    const query = searchTerm.trim().toLowerCase()
    if (!query) return currentTable.rows
    return currentTable.rows.filter((row) =>
      currentTable.columns.some((column) => String(row[column] ?? '').toLowerCase().includes(query))
    )
  }, [currentTable, searchTerm])

  const pageCount = useMemo(() => {
    if (filteredRows.length === 0) return 1
    return Math.ceil(filteredRows.length / pageSize)
  }, [filteredRows.length, pageSize])

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageIndex, pageSize])

  const handleSaveDraftRow = async () => {
    if (!currentTable || !draftRow || !draftRowTableId) return
    setIsSavingDraft(true)
    try {
      const response = await fetch('/api/admin/database-row', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId: draftRowTableId,
          data: draftRow,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || uiText.rowSaveFailed)
      }

      toast.success(uiText.rowSaved)
      setDraftRow(null)
      setDraftRowTableId(null)
      void loadSnapshot(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : uiText.rowSaveFailed)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleUpdateRow = async () => {
    if (!currentTable || !editingRowData || !editingRowId) return
    setIsSavingDraft(true)
    try {
      const response = await fetch('/api/admin/database-row', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: currentTable.id,
          id: editingRowId,
          data: editingRowData,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || uiText.rowSaveFailed)

      toast.success(uiText.rowSaved)
      setEditingRowId(null)
      setEditingRowData(null)
      void loadSnapshot(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : uiText.rowSaveFailed)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleDownloadUnifiedSnapshot = async () => {
    if (!snapshot) return

    const generatedAt = new Date(snapshot.generatedAt).toISOString().slice(0, 10)
    await downloadWorkbookXlsx(`neon-database-full-${generatedAt}.xlsx`, snapshot, {
      scope: uiText.scope,
      generatedAt: uiText.generatedAt,
      summary: uiText.summary,
      sheet: uiText.sheet,
      rows: uiText.rows,
      columns: uiText.columns,
      description: uiText.description,
      defaultSheetName: uiText.defaultSheetName,
      overflowSheetName: uiText.overflowSheetName,
      overflowHeaderSheet: uiText.overflowHeaderSheet,
      overflowHeaderRow: uiText.overflowHeaderRow,
      overflowHeaderColumn: uiText.overflowHeaderColumn,
      overflowHeaderPart: uiText.overflowHeaderPart,
      overflowHeaderValue: uiText.overflowHeaderValue,
      overflowValueMarker: uiText.overflowValueMarker,
      columnPrefix: uiText.columnPrefix,
    }, tDb)
    toast.success(uiText.workbookDownloaded)
  }

  const handleDownloadCurrentTable = async () => {
    if (!currentTable || !snapshot) return

    const generatedAt = new Date(snapshot.generatedAt).toISOString().slice(0, 10)
    await downloadSingleTableXlsx(`neon-${currentTable.id}-${generatedAt}.xlsx`, currentTable, {
      scope: uiText.scope,
      generatedAt: uiText.generatedAt,
      summary: uiText.summary,
      sheet: uiText.sheet,
      rows: uiText.rows,
      columns: uiText.columns,
      description: uiText.description,
      defaultSheetName: uiText.defaultSheetName,
      overflowSheetName: uiText.overflowSheetName,
      overflowHeaderSheet: uiText.overflowHeaderSheet,
      overflowHeaderRow: uiText.overflowHeaderRow,
      overflowHeaderColumn: uiText.overflowHeaderColumn,
      overflowHeaderPart: uiText.overflowHeaderPart,
      overflowHeaderValue: uiText.overflowHeaderValue,
      overflowValueMarker: uiText.overflowValueMarker,
      columnPrefix: uiText.columnPrefix,
    }, tDb)
    toast.success(`${currentTable.title}: ${uiText.fullSheetDownloaded}`)
  }

  const handleDownloadUnifiedSnapshotClick = () => {
    void handleDownloadUnifiedSnapshot().catch((error) => {
      toast.error(error instanceof Error ? error.message : uiText.failedDownloadWorkbook)
    })
  }

  const handleDownloadCurrentTableClick = () => {
    void handleDownloadCurrentTable().catch((error) => {
      toast.error(error instanceof Error ? error.message : uiText.failedDownloadSheet)
    })
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background bg-app-paper">
        <div className="pointer-events-none fixed inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[20rem] bg-gradient-to-b from-main/20 via-main/10 to-transparent" />
        <div className="relative z-10 mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{uiText.loadingWorkspace}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-app-paper">
      <div className="pointer-events-none fixed inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[20rem] bg-gradient-to-b from-main/20 via-main/10 to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void handleImportFileChosen(event.target.files?.[0] ?? null)}
        aria-hidden
      />
      <Input
        ref={allSheetsFileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void handleImportAllSheetsFileChosen(event.target.files?.[0] ?? null)}
        aria-hidden
      />
 <Card className="overflow-hidden">
 <CardHeader className="">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                {uiText.workspaceTitle}
              </CardTitle>
              <CardDescription>
                {uiText.workspaceDescription(snapshot?.scope ?? uiText.unknownScope, lastSyncedLabel)}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="icon" aria-label={uiText.backToMiddleAdmin} title={uiText.backToMiddleAdmin}>
                <Link href="/middle-admin">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">{uiText.backToMiddleAdmin}</span>
                </Link>
              </Button>
              <div className="hidden text-sm text-muted-foreground sm:block">
                {tables.length} {uiText.sheetsCount}
              </div>
              
              <CalendarRangeSelector
                value={date}
                onChange={setDate}
                uiText={{
                  calendar: menuChip,
                  today: uiText.today,
                  thisWeek: uiText.thisWeek,
                  thisMonth: uiText.thisMonth,
                  clearRange: uiText.clearRange,
                  allTime: uiText.allTime,
                }}
                locale={language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'}
              />

              <IconButton
                label={uiText.refresh}
                variant="outline"
                iconSize="md"
                onClick={() => void loadSnapshot(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </IconButton>
              <IconButton
                label={uiText.downloadAllSheets}
                variant="outline"
                iconSize="md"
                onClick={handleDownloadUnifiedSnapshotClick}
              >
                <Download className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={isImportingAllSheets ? uiText.importingAllSheets : uiText.importAllSheets}
                variant="outline"
                iconSize="md"
                onClick={handleImportAllSheetsClick}
                disabled={isImportingAllSheets}
              >
                {isImportingAllSheets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </IconButton>
              <LanguageSwitcher />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Profile" variant="ghost" iconSize="md">
                    <CircleUser className="h-4 w-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild className="gap-2">
                    <Link href="/middle-admin?chat=1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-2">
                    <Link href="/middle-admin?settings=1">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <SearchPanel value={tableQuery} onChange={setTableQuery} placeholder={uiText.searchTables} />

            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger
                value="summary"
                title={uiText.summary}
                aria-label={uiText.summary}
                className="h-9 w-9 shrink-0 px-0"
              >
                <SheetIcon id="summary" className="h-4 w-4" />
                <span className="sr-only">{uiText.summary}</span>
              </TabsTrigger>
              {visibleTables.map((table) => (
                <TabsTrigger
                  key={table.id}
                  value={table.id}
                  title={tDb(table.title)}
                  aria-label={tDb(table.title)}
                  className="h-9 w-9 shrink-0 px-0"
                >
                  <SheetIcon id={table.id} className="h-4 w-4" />
                  <span className="sr-only">{tDb(table.title)}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
 <div className="rounded-base shadow-shadow">
 <div className="p-4">
                  <p className="text-sm font-semibold">{uiText.allNeonSheets}</p>
                  <p className="text-xs text-muted-foreground">{uiText.allNeonSheetsDescription}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{uiText.sheet}</TableHead>
                      <TableHead>{uiText.rows}</TableHead>
                      <TableHead>{uiText.columns}</TableHead>
                      <TableHead>{uiText.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{tDb(item.title)}</TableCell>
                        <TableCell>{item.rowCount}</TableCell>
                        <TableCell>{item.columnCount}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {tables.map((table) => (
              <TabsContent key={table.id} value={table.id} className="space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-base bg-card p-4 shadow-shadow">
                  <div>
                    <p className="text-lg font-semibold">{tDb(table.title)}</p>
                    <p className="text-sm text-muted-foreground">{table.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SearchPanel
                      value={activeTab === table.id ? searchTerm : ''}
                      onChange={setSearchTerm}
                      placeholder={uiText.searchInTable(tDb(table.title))}
                    />
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {filteredRows.length} / {table.rowCount} {uiText.rowsCount}
                    </div>
                    <IconButton
                      label={uiText.downloadSheet}
                      variant="outline"
                      iconSize="md"
                      onClick={handleDownloadCurrentTableClick}
                    >
                      <Download className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={isImportingSheet ? uiText.importingSheet : uiText.importSheet}
                      variant="outline"
                      iconSize="md"
                      onClick={() => handleImportSheetClick(table.id)}
                      disabled={isImportingSheet}
                    >
                      {isImportingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </IconButton>
                  </div>
                </div>

 <div className="overflow-hidden rounded-base shadow-shadow">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {table.columns.map((column) => (
                            <TableHead key={column} className="min-w-[160px] whitespace-nowrap">
                              {tDb(column)}
                            </TableHead>
                          ))}
                          <TableHead className="w-[100px] text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftRowTableId === table.id && draftRow !== null && (
                          <TableRow className="bg-muted/20">
                            {table.columns.map((column) => (
                              <TableCell key={`draft-${column}`}>
                                {column === 'id' ? (
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">{uiText.autoGenerated}</div>
                                ) : column === 'createdAt' || column === 'updatedAt' ? (
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">{uiText.autoTimed}</div>
                                ) : (
                                  <Input
                                    value={draftRow[column] || ''}
                                    onChange={(event) =>
                                      setDraftRow((prev) => ({ ...(prev || {}), [column]: event.target.value }))
                                    }
                                    placeholder={uiText.enterValue(tDb(column))}
                                    className="min-w-[120px] h-8 text-sm"
                                    disabled={isSavingDraft}
                                  />
                                )}
                              </TableCell>
                            ))}
                            <TableCell></TableCell>
                          </TableRow>
                        )}

                        {pageRows.length > 0 ? (
                          pageRows.map((row, index) => (
                            editingRowId === row.id && row.id ? (
                              <TableRow key={`${table.id}-editing-${index}`} className="bg-muted/20">
                                {table.columns.map((column) => (
                                  <TableCell key={`editing-${column}`}>
                                    {column === 'id' || column === 'createdAt' || column === 'updatedAt' ? (
                                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        {row[column] || '-'}
                                      </div>
                                    ) : (
                                      <Input
                                        value={editingRowData?.[column] || ''}
                                        onChange={(event) =>
                                          setEditingRowData((prev) => ({
                                            ...(prev || {}),
                                            [column]: event.target.value,
                                          }))
                                        }
                                        className="min-w-[120px] h-8 text-sm"
                                        disabled={isSavingDraft}
                                      />
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <IconButton label={uiText.saveEdit} iconSize="md" onClick={handleUpdateRow} disabled={isSavingDraft}>
                                      {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </IconButton>
                                    <IconButton
                                      label={uiText.cancelEdit}
                                      variant="outline"
                                      iconSize="md"
                                      onClick={() => {
                                        setEditingRowId(null)
                                        setEditingRowData(null)
                                      }}
                                      disabled={isSavingDraft}
                                    >
                                      <X className="h-4 w-4" />
                                    </IconButton>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow key={`${table.id}-${index}`}>
                                {table.columns.map((column) => (
                                  <TableCell key={`${table.id}-${index}-${column}`} className="max-w-[320px] align-top">
                                    <div className="line-clamp-4 whitespace-pre-wrap break-words text-sm">
                                      {tDbValue(row[column] || '-')}
                                    </div>
                                  </TableCell>
                                ))}
                                <TableCell className="text-right align-top">
                                  {row.id ? (
                                    <IconButton
                                      label={uiText.editRow}
                                      variant="ghost"
                                      iconSize="md"
                                      onClick={() => {
                                        setEditingRowId(row.id as string)
                                        setEditingRowData(row as Record<string, string>)
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </IconButton>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            )
                          ))
                        ) : draftRowTableId !== table.id ? (
                          <TableRow>
                            <TableCell
                              colSpan={table.columns.length + 1}
                              className="py-10 text-center text-sm text-muted-foreground"
                            >
                              {uiText.noRowsMatch}
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>

 <div className="bg-muted/15 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {uiText.rowsRange(
                            filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1,
                            filteredRows.length === 0
                              ? 0
                              : Math.min((pageIndex + 1) * pageSize, filteredRows.length),
                            filteredRows.length
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{uiText.rowsPerPage}</span>
                          <div className="flex items-center gap-1">
                            {[25, 50, 100].map((size) => (
                              <Button
                                key={size}
                                type="button"
                                variant={pageSize === size ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setPageSize(size as 25 | 50 | 100)}
                                disabled={
                                  isSavingDraft ||
                                  editingRowId !== null ||
                                  (draftRowTableId === table.id && draftRow !== null)
                                }
                              >
                                {size}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <IconButton
                          label={uiText.previous}
                          variant="outline"
                          iconSize="sm"
                          onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                          disabled={
                            pageIndex === 0 ||
                            isSavingDraft ||
                            editingRowId !== null ||
                            (draftRowTableId === table.id && draftRow !== null)
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={uiText.next}
                          variant="outline"
                          iconSize="sm"
                          onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                          disabled={
                            pageIndex >= pageCount - 1 ||
                            isSavingDraft ||
                            editingRowId !== null ||
                            (draftRowTableId === table.id && draftRow !== null)
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </IconButton>

                        {draftRowTableId === table.id && draftRow !== null ? (
                          <>
                            <IconButton
                              label={uiText.cancelRow}
                              variant="outline"
                              iconSize="sm"
                              onClick={() => {
                                setDraftRow(null)
                                setDraftRowTableId(null)
                              }}
                              disabled={isSavingDraft}
                            >
                              <X className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              label={uiText.saveRow}
                              iconSize="sm"
                              onClick={() => void handleSaveDraftRow()}
                              disabled={isSavingDraft}
                            >
                              {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            label={uiText.addRow}
                            variant="outline"
                            iconSize="sm"
                            onClick={() => {
                              setDraftRow({})
                              setDraftRowTableId(table.id)
                            }}
                            disabled={isSavingDraft || editingRowId !== null}
                          >
                            <Plus className="h-4 w-4" />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

