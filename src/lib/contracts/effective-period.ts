// C5 / §3.3 (R9–R10): the effective state of a contract day. A day is enabled
// when the contract and a covering period are ENABLED, the weekday is assigned
// for the period, and no disabling decision (override or stored period
// disabledDates) is the latest decision made on or before that day inside the
// period — disabling a day cascades forward to every later day of the period
// until an explicit re-enable restarts the enabled stretch (spec: вкл→выкл→вкл).

import { CONTRACT_WEEKDAYS, type ContractWeekday } from './periods'

export type ContractAvailabilityState = 'ENABLED' | 'DISABLED'

export type ContractDayOverride = {
  date: string
  state: ContractAvailabilityState
}

export type EffectiveContractPeriodInput = {
  id: string
  startDate: string
  endDate: string
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  autoRenew?: boolean
  enabledWeekdays: readonly string[]
  disabledDates?: readonly string[]
  courierId?: string | null
}

export type EffectiveContractInput = {
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  autoRenew?: boolean
  periods: readonly EffectiveContractPeriodInput[]
}

export type ContractDaySource =
  | 'CONTRACT_DISABLED'
  | 'NO_PERIOD'
  | 'PERIOD_DISABLED'
  | 'PERIOD_DISABLED_DATE'
  | 'WEEKDAY_NOT_ASSIGNED'
  | 'CASCADE_DISABLED'
  | 'OVERRIDE_ENABLED'
  | 'ENABLED'

export type ContractDayDecision = {
  enabled: boolean
  source: ContractDaySource
  periodId: string | null
}

function isoDateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeContractDate(value: string): string {
  return value.slice(0, 10)
}

function coversDate(period: EffectiveContractPeriodInput, date: string): boolean {
  return normalizeContractDate(period.startDate) <= date && date <= normalizeContractDate(period.endDate)
}

function weekdayKeyOf(date: string): ContractWeekday {
  const parsed = new Date(`${normalizeContractDate(date)}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'SUNDAY'
  return CONTRACT_WEEKDAYS[parsed.getDay()]
}

function latestOverrideOnOrBefore(
  overrides: readonly ContractDayOverride[],
  period: EffectiveContractPeriodInput,
  date: string,
): ContractDayOverride | null {
  let latest: ContractDayOverride | null = null
  const periodStart = normalizeContractDate(period.startDate)
  for (const override of overrides) {
    if (!override || typeof override.date !== 'string') continue
    const overrideDate = normalizeContractDate(override.date)
    if (overrideDate < periodStart || overrideDate > date) continue
    if (override.state !== 'ENABLED' && override.state !== 'DISABLED') continue
    if (!latest || overrideDate > normalizeContractDate(latest.date)) latest = override
  }
  return latest
}

/**
 * Full decision for one contract day: enabled flag plus the reason, so the
 * calendar can colour the day (amber enabled / red cascaded) and label the
 * source. Pure: reads only the passed contract and overrides.
 */
export function decideContractDay(
  contract: EffectiveContractInput,
  period: EffectiveContractPeriodInput,
  overrides: readonly ContractDayOverride[],
  date: string,
): ContractDayDecision {
  const normalizedDate = normalizeContractDate(date)
  if (contract.status !== 'ENABLED') return { enabled: false, source: 'CONTRACT_DISABLED', periodId: null }
  if (period.status !== 'ENABLED' || !coversDate(period, normalizedDate)) {
    return { enabled: false, source: 'NO_PERIOD', periodId: period.id }
  }
  const disabledDates = Array.isArray(period.disabledDates) ? period.disabledDates : []
  if (disabledDates.some((disabled) => normalizeContractDate(disabled) === normalizedDate)) {
    return { enabled: false, source: 'PERIOD_DISABLED_DATE', periodId: period.id }
  }
  if (!period.enabledWeekdays.includes(weekdayKeyOf(normalizedDate))) {
    return { enabled: false, source: 'WEEKDAY_NOT_ASSIGNED', periodId: period.id }
  }
  const latest = latestOverrideOnOrBefore(overrides, period, normalizedDate)
  if (latest && latest.state === 'DISABLED') {
    return { enabled: false, source: 'CASCADE_DISABLED', periodId: period.id }
  }
  if (latest && latest.state === 'ENABLED') {
    return { enabled: true, source: 'OVERRIDE_ENABLED', periodId: period.id }
  }
  return { enabled: true, source: 'ENABLED', periodId: period.id }
}

function findCoveringPeriod(
  contract: EffectiveContractInput,
  date: string,
): EffectiveContractPeriodInput | null {
  for (const period of contract.periods) {
    if (period.status === 'ENABLED' && coversDate(period, normalizeContractDate(date))) return period
  }
  return null
}

/** Boolean form of the spec rule used by demand and courier surfaces. */
export function effectiveContractDay(
  contract: EffectiveContractInput,
  overrides: readonly ContractDayOverride[],
  date: string,
): boolean {
  const period = findCoveringPeriod(contract, date)
  if (!period) return false
  return decideContractDay(contract, period, overrides, date).enabled
}

/**
 * R18 (cascade orders): an order in an effectively disabled contract day is
 * suppressed for the courier unless an ORDER-level ENABLED override exists on
 * its delivery date. Returns true when at least one covering enabled period of
 * the customer makes the day a contract day (weekday assigned) but the
 * effective decision disables it.
 */
export function isOrderSuppressedByContractCascade(
  contractsOfCustomer: readonly { contract: EffectiveContractInput; overrides: readonly ContractDayOverride[] }[],
  date: string,
  orderEnabledDates: ReadonlySet<string> = new Set<string>(),
): boolean {
  const normalizedDate = normalizeContractDate(date)
  if (orderEnabledDates.has(normalizedDate)) return false
  let sawContractDay = false
  for (const entry of contractsOfCustomer) {
    const period = findCoveringPeriod(entry.contract, normalizedDate)
    if (!period) continue
    const decision = decideContractDay(entry.contract, period, entry.overrides, normalizedDate)
    const baseWeekday = decision.source !== 'WEEKDAY_NOT_ASSIGNED' && decision.source !== 'NO_PERIOD' && decision.source !== 'PERIOD_DISABLED'
    if (!baseWeekday) continue
    sawContractDay = true
    if (decision.enabled) return false
  }
  return sawContractDay
}

/**
 * R11 (+7): the virtual enabled renewal day shown after the last period's end
 * while the contract keeps auto-renewing and the renewal week has not been
 * written yet. `nextRenewalPeriod` owns the range math; this helper decides
 * visibility and the date to render — the tile follows the latest ending
 * enabled period, so it keeps pointing at the next unwritten renewal week.
 */
export function computeRenewalExtensionDay(
  contract: EffectiveContractInput & { autoRenew?: boolean },
  periods: readonly EffectiveContractPeriodInput[],
): { date: string; until: string } | null {
  if (contract.status !== 'ENABLED') return null
  if (contract.autoRenew === false) return null
  const enabledPeriods = periods
    .filter((period) => period.status === 'ENABLED')
    .slice()
    .sort((left, right) => normalizeContractDate(left.endDate).localeCompare(normalizeContractDate(right.endDate)))
  const last = enabledPeriods.at(-1)
  if (!last || !last.autoRenew) return null
  const endDate = normalizeContractDate(last.endDate)
  const start = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  start.setDate(start.getDate() + 1)
  const renewalStart = isoDateKey(start)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { date: renewalStart, until: isoDateKey(end) }
}
