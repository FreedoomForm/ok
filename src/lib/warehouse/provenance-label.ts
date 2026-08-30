import type { CookingConsumptionRecord, CookingProvenance } from './cooking-consumption'

// §11: the cooking preparation page must show which client, contract, set,
// group and order caused each requirement. The persisted provenance stores
// only stable ids, so the readable names are resolved at read time by the
// API route and localized here. Unresolvable ids are omitted honestly —
// never guessed into a wrong name.

const MAX_IDS_PER_SECTION = 200

export type CookingProvenanceLookups = {
  clientName: (id: string) => string | null
  contractLabel: (id: string) => string | null
  orderLabel: (id: string) => string | null
  setName: (id: string) => string | null
}

export type CookingProvenanceIdSets = {
  clientIds: Set<string>
  contractIds: Set<string>
  orderIds: Set<string>
  setIds: Set<string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim().length > 0 && !out.includes(entry)) out.push(entry)
    if (out.length >= MAX_IDS_PER_SECTION) break
  }
  return out
}

export function collectCookingProvenanceIds(records: readonly CookingConsumptionRecord[]): CookingProvenanceIdSets {
  const ids: CookingProvenanceIdSets = { clientIds: new Set(), contractIds: new Set(), orderIds: new Set(), setIds: new Set() }
  for (const record of Array.isArray(records) ? records : []) {
    const provenance = isRecord(record) && isRecord((record as unknown as { provenance?: unknown }).provenance)
      ? (record as unknown as { provenance: Record<string, unknown> }).provenance
      : null
    if (!provenance) continue
    for (const id of boundedIds(provenance.clientIds)) ids.clientIds.add(id)
    for (const id of boundedIds(provenance.contractIds)) ids.contractIds.add(id)
    for (const id of boundedIds(provenance.orderIds)) ids.orderIds.add(id)
    if (typeof provenance.setId === 'string' && provenance.setId.trim().length > 0) ids.setIds.add(provenance.setId)
  }
  return ids
}

function section(language: 'ru' | 'uz', labels: { ru: string; uz: string }): string {
  return language === 'uz' ? labels.uz : labels.ru
}

export function buildCookingProvenanceLabel(
  provenance: CookingProvenance | null | undefined,
  lookups: CookingProvenanceLookups,
  language: 'ru' | 'uz',
): string {
  if (!provenance || typeof provenance !== 'object') return ''
  const parts: string[] = []
  const clientNames = boundedIds(provenance.clientIds)
    .map((id) => lookups.clientName(id))
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
  if (clientNames.length > 0) parts.push(`${section(language, { ru: 'Клиенты', uz: 'Mijozlar' })}: ${clientNames.join(', ')}`)
  const contractLabels = boundedIds(provenance.contractIds)
    .map((id) => lookups.contractLabel(id))
    .filter((label): label is string => typeof label === 'string' && label.length > 0)
  if (contractLabels.length > 0) parts.push(`${section(language, { ru: 'Контракт', uz: 'Shartnoma' })}: ${contractLabels.join(', ')}`)
  const orderLabels = boundedIds(provenance.orderIds)
    .map((id) => lookups.orderLabel(id))
    .filter((label): label is string => typeof label === 'string' && label.length > 0)
  if (orderLabels.length > 0) parts.push(`${section(language, { ru: 'Заказы', uz: 'Buyurtmalar' })}: ${orderLabels.join(', ')}`)
  if (typeof provenance.setId === 'string' && provenance.setId.trim().length > 0) {
    const setName = lookups.setName(provenance.setId)
    if (setName) parts.push(`${section(language, { ru: 'Сет', uz: 'Set' })}: ${setName}`)
  }
  if (typeof provenance.groupCalories === 'number' && Number.isFinite(provenance.groupCalories) && provenance.groupCalories > 0) {
    parts.push(`${section(language, { ru: 'Группа', uz: 'Guruh' })}: ${provenance.groupCalories} ${section(language, { ru: 'ккал', uz: 'kkal' })}`)
  }
  return parts.join('; ')
}

export function buildCookingProvenanceLabels(
  records: readonly CookingConsumptionRecord[],
  lookups: CookingProvenanceLookups,
  language: 'ru' | 'uz',
): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const record of Array.isArray(records) ? records : []) {
    if (!isRecord(record) || typeof (record as { dishId?: unknown }).dishId !== 'string') continue
    const typed = record as CookingConsumptionRecord
    if (!Number.isInteger(typed.calorie)) continue
    const label = buildCookingProvenanceLabel(typed.provenance, lookups, language)
    if (label.length > 0) labels[`${typed.dishId}:${typed.calorie}`] = label
  }
  return labels
}
