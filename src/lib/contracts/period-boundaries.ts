// C5 / §3.3 (R12): virtual boundary markers for the contract calendar. When an
// enabled stretch hands over to a disabled one (or back), the spec inserts a
// marker day right before the new stretch: an ENABLED marker before the first
// disabled day ("конец включённого периода"), a DISABLED marker before the
// first enabled day after a disabled stretch ("конец отключённого периода").
// The marker is virtual — never written to the DB — and only fills a calendar
// slot that is not already a relevant day of the period: when the neighbouring
// day itself shows the boundary state, the real tile already marks the edge.

import type { ContractAvailabilityState, ContractDayOverride, EffectiveContractPeriodInput } from './effective-period'
import { decideContractDay } from './effective-period'
import { CONTRACT_WEEKDAYS } from './periods'

export type PeriodBoundaryMarker = {
  date: string
  state: ContractAvailabilityState
  kind: 'BOUNDARY'
}

type Relevance = { state: ContractAvailabilityState; relevant: boolean }

function isoDateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function previousDateKey(date: string): string {
  const parsed = parseDate(date)
  parsed.setDate(parsed.getDate() - 1)
  return isoDateKey(parsed)
}

function weekdayOf(date: string): string {
  const parsed = parseDate(date)
  if (Number.isNaN(parsed.getTime())) return 'SUNDAY'
  return CONTRACT_WEEKDAYS[parsed.getDay()]
}

function normalizeDateKey(value: string): string {
  return value.slice(0, 10)
}

/**
 * Relevance of one calendar day for the period timeline: a day is relevant
 * when an explicit override lands on it or the weekday is assigned for the
 * period; neutral (non-assigned, non-overridden) days are calendar filler
 * that can carry a virtual marker tile.
 */
function dayRelevance(
  contractEnabled: boolean,
  period: EffectiveContractPeriodInput,
  overrides: readonly ContractDayOverride[],
  date: string,
): Relevance {
  const normalizedDate = normalizeDateKey(date)
  if (!contractEnabled || period.status !== 'ENABLED') return { state: 'ENABLED', relevant: false }
  if (normalizeDateKey(period.startDate) > normalizedDate || normalizedDate > normalizeDateKey(period.endDate)) {
    return { state: 'ENABLED', relevant: false }
  }
  const override = overrides.find(
    (entry) => normalizeDateKey(entry.date) === normalizedDate && (entry.state === 'ENABLED' || entry.state === 'DISABLED'),
  )
  if (override) return { state: override.state, relevant: true }
  const enabledWeekdays = Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays : []
  if (!enabledWeekdays.includes(weekdayOf(normalizedDate))) return { state: 'ENABLED', relevant: false }
  const disabledDates = Array.isArray(period.disabledDates) ? period.disabledDates : []
  if (disabledDates.some((disabled) => normalizeDateKey(disabled) === normalizedDate)) {
    return { state: 'DISABLED', relevant: true }
  }
  const decision = decideContractDay({ status: 'ENABLED', periods: [period] }, period, overrides, normalizedDate)
  return { state: decision.enabled ? 'ENABLED' : 'DISABLED', relevant: true }
}

/**
 * Computes the virtual marker tiles for one contract period inside the visible
 * calendar window. Pure: no DB access, inputs untouched. Each stretch change
 * inside the window yields at most one marker — the ending stretch's state —
 * rendered on the neutral calendar slot directly before the new stretch.
 */
export function computePeriodBoundaryMarkers(
  period: EffectiveContractPeriodInput,
  overrides: readonly ContractDayOverride[],
  window: readonly string[],
  contractEnabled = true,
): PeriodBoundaryMarker[] {
  if (!Array.isArray(window) || window.length === 0) return []
  const dates = [...new Set(window.map((date) => normalizeDateKey(date)))].sort()
  const relevance = new Map<string, Relevance>()
  for (const date of dates) {
    relevance.set(date, dayRelevance(contractEnabled, period, overrides, date))
  }
  const markers: PeriodBoundaryMarker[] = []
  const markedSlots = new Set<string>()
  let previousRelevant: { state: ContractAvailabilityState } | null = null
  for (const date of dates) {
    const current = relevance.get(date)
    if (!current?.relevant) continue
    const ending = previousRelevant
    previousRelevant = { state: current.state }
    if (!ending || ending.state === current.state) continue
    // The effective stretch changed at this day. The virtual marker day sits
    // on the slot right before it when that slot is neutral filler; if the
    // neighbouring slot is itself a relevant day, the boundary is already
    // visible without any virtual tile.
    const slot = previousDateKey(date)
    if (!relevance.has(slot) || markedSlots.has(slot)) continue
    if (relevance.get(slot)?.relevant) continue
    markers.push({ date: slot, state: ending.state, kind: 'BOUNDARY' })
    markedSlots.add(slot)
  }
  return markers
}
