import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  getImportFileError,
  validateImportDimensions,
  validateImportFileMetadata,
} from '../src/lib/admin/database-xlsx-import'

test('accepts a non-empty file within the import size limit', () => {
  assert.equal(validateImportFileMetadata({ size: 128 }), null)
  assert.equal(getImportFileError({ size: 128 } as unknown as FormDataEntryValue), null)
})

test('rejects missing, empty, and oversized files', () => {
  assert.equal(validateImportFileMetadata(null), 'Missing file')
  assert.equal(validateImportFileMetadata({ size: 0 }), 'File is empty')
  assert.equal(
    validateImportFileMetadata({ size: MAX_IMPORT_FILE_BYTES + 1 }),
    `File is too large. Limit is ${MAX_IMPORT_FILE_BYTES} bytes.`,
  )
})

test('enforces worksheet row and column bounds', () => {
  assert.equal(validateImportDimensions({ rows: MAX_IMPORT_ROWS, columns: 2 }), null)
  assert.equal(validateImportDimensions({ rows: MAX_IMPORT_ROWS + 1, columns: 2 }), `Too many rows (${MAX_IMPORT_ROWS + 1}). Limit is ${MAX_IMPORT_ROWS}.`)
  assert.equal(validateImportDimensions({ rows: 1, columns: MAX_IMPORT_COLUMNS + 1 }), `Too many columns (${MAX_IMPORT_COLUMNS + 1}). Limit is ${MAX_IMPORT_COLUMNS}.`)
  assert.equal(validateImportDimensions({ rows: 1, columns: 0 }), 'Worksheet has no header row')
})
