export const MAX_IMPORT_ROWS = 2_000
export const MAX_IMPORT_COLUMNS = 100
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024

export interface ImportDimensions {
  rows: number
  columns: number
}

export function validateImportFileMetadata(file: { size: number } | null): string | null {
  if (!file) return 'Missing file'
  if (!Number.isFinite(file.size) || file.size <= 0) return 'File is empty'
  if (file.size > MAX_IMPORT_FILE_BYTES) return `File is too large. Limit is ${MAX_IMPORT_FILE_BYTES} bytes.`
  return null
}

export function validateImportDimensions({ rows, columns }: ImportDimensions): string | null {
  if (!Number.isInteger(rows) || rows < 0) return 'Invalid worksheet row count'
  if (rows > MAX_IMPORT_ROWS) return `Too many rows (${rows}). Limit is ${MAX_IMPORT_ROWS}.`
  if (!Number.isInteger(columns) || columns <= 0) return 'Worksheet has no header row'
  if (columns > MAX_IMPORT_COLUMNS) return `Too many columns (${columns}). Limit is ${MAX_IMPORT_COLUMNS}.`
  return null
}

export function getImportFileError(file: FormDataEntryValue | null): string | null {
  if (!file || typeof file === 'string') return 'Missing file'
  return validateImportFileMetadata(file)
}
