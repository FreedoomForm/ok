export const DATABASE_TABLE_IDS = [
  'admins',
  'customers',
  'orders',
  'transactions',
  'websites',
  'menuSets',
  'menus',
  'dishes',
  'warehouse',
  'cookingPlans',
  'actionLogs',
  'orderAudit',
] as const

export type DatabaseTableId = (typeof DATABASE_TABLE_IDS)[number]

export type DatabaseRowScalar = string | number | boolean | Date | undefined
export type DatabaseRowData = Record<string, DatabaseRowScalar>

export interface DatabaseRowRequest {
  tableId: DatabaseTableId
  id?: string
  data: DatabaseRowData
}

export interface DatabaseRowValidationFailure {
  ok: false
  error: string
}

export interface DatabaseRowValidationSuccess {
  ok: true
  value: DatabaseRowRequest
}

export type DatabaseRowValidation = DatabaseRowValidationFailure | DatabaseRowValidationSuccess

const MAX_FIELD_COUNT = 100
const MAX_FIELD_NAME_LENGTH = 80
const MAX_STRING_VALUE_LENGTH = 10_000
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor', 'id'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDatabaseTableId(value: unknown): value is DatabaseTableId {
  return typeof value === 'string' && (DATABASE_TABLE_IDS as readonly string[]).includes(value)
}

export function coerceDatabaseValue(value: unknown): DatabaseRowScalar {
  const stringValue = String(value)
  if (stringValue === '') return undefined
  if (stringValue.toLowerCase() === 'true') return true
  if (stringValue.toLowerCase() === 'false') return false
  if (!Number.isNaN(Number(stringValue)) && stringValue.trim() !== '') return Number(stringValue)

  const date = new Date(stringValue)
  if (!Number.isNaN(date.getTime()) && stringValue.includes('-') && stringValue.length >= 10) return date
  return stringValue
}

function isValidationFailure(value: DatabaseRowData | DatabaseRowValidationFailure): value is DatabaseRowValidationFailure {
  return 'ok' in value && value.ok === false
}

function parseRowData(value: unknown): DatabaseRowData | DatabaseRowValidationFailure {
  if (!isRecord(value)) return { ok: false, error: 'Missing tableId or data' }

  const entries = Object.entries(value)
  if (entries.length > MAX_FIELD_COUNT) {
    return { ok: false, error: 'Too many row fields' }
  }

  const parsedData: DatabaseRowData = {}
  for (const [key, rawValue] of entries) {
    if (FORBIDDEN_KEYS.has(key)) continue
    if (key.length > MAX_FIELD_NAME_LENGTH || !IDENTIFIER_PATTERN.test(key)) {
      return { ok: false, error: 'Invalid row field name' }
    }
    if (isRecord(rawValue) || Array.isArray(rawValue)) {
      return { ok: false, error: 'Row field values must be scalar' }
    }

    const coerced = coerceDatabaseValue(rawValue)
    if (typeof coerced === 'string' && coerced.length > MAX_STRING_VALUE_LENGTH) {
      return { ok: false, error: 'Row field value is too long' }
    }
    parsedData[key] = coerced
  }

  return parsedData
}

export function parseDatabaseRowRequest(body: unknown, options: { requireId: boolean }): DatabaseRowValidation {
  if (!isRecord(body)) return { ok: false, error: options.requireId ? 'Missing tableId, id, or data' : 'Missing tableId or data' }

  const tableId = body.tableId
  if (!isDatabaseTableId(tableId)) return { ok: false, error: options.requireId ? 'Missing tableId, id, or data' : 'Missing tableId or data' }

  const id = body.id
  if (options.requireId && (typeof id !== 'string' || id.length === 0 || id.length > 100)) {
    return { ok: false, error: 'Missing tableId, id, or data' }
  }

  const data = parseRowData(body.data)
  if (isValidationFailure(data)) return data

  return {
    ok: true,
    value: {
      tableId,
      ...(options.requireId ? { id: id as string } : {}),
      data,
    },
  }
}
