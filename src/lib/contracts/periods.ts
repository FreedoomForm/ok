export const CONTRACT_WEEKDAYS = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
] as const

export type ContractWeekday = (typeof CONTRACT_WEEKDAYS)[number]

export type ContractPeriodDraft = {
  id: string
  startDate: string
  endDate: string
  autoRenew: boolean
  enabledWeekdays: readonly ContractWeekday[]
  disabledDates: readonly string[]
}

function localDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid contract date')
  return date
}

function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nextRenewalPeriod(period: ContractPeriodDraft, explicitStartDate?: string) {
  if (!period.autoRenew) return null
  const start = explicitStartDate ? localDate(explicitStartDate) : localDate(period.endDate)
  if (!explicitStartDate) start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    startDate: isoDate(start),
    endDate: isoDate(end),
    autoRenew: true,
    enabledWeekdays: [...period.enabledWeekdays],
    disabledDates: [],
  }
}

export function isContractEnabledOn(period: ContractPeriodDraft, date: string): boolean {
  const candidate = localDate(date)
  const start = localDate(period.startDate)
  const end = localDate(period.endDate)
  const normalized = isoDate(candidate)
  if (candidate < start || candidate > end) return false
  if (period.disabledDates.some((disabledDate) => disabledDate.slice(0, 10) === normalized)) return false
  const weekday = CONTRACT_WEEKDAYS[candidate.getDay()]
  return period.enabledWeekdays.includes(weekday)
}
