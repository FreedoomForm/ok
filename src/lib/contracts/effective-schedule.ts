import { isContractEnabledOn, type ContractPeriodDraft, type ContractWeekday } from './periods'

type EffectivePeriod = Omit<ContractPeriodDraft, 'id' | 'autoRenew' | 'enabledWeekdays'> & {
  enabledWeekdays: readonly string[]
  id?: string
  autoRenew?: boolean
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
}

type EffectiveContract = {
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  autoRenew?: boolean
  periods: readonly EffectivePeriod[]
}

export type SchedulableCustomer = {
  autoOrdersEnabled: boolean
  orderPattern?: string | null
  contracts?: readonly EffectiveContract[]
}

function legacyPatternEligible(pattern: string | null | undefined, date: Date) {
  const day = date.getDate()
  if (pattern === 'every_other_day_even') return day % 2 === 0
  if (pattern === 'every_other_day_odd') return day % 2 === 1
  return true
}

export function isCustomerScheduledOn(customer: SchedulableCustomer, date: string): boolean {
  if (!customer.autoOrdersEnabled) return false
  if (customer.contracts && customer.contracts.length > 0) {
    return customer.contracts.some((contract) => {
      if (contract.status !== 'ENABLED') return false
      return contract.periods.some((period) => {
        if (period.status !== 'ENABLED') return false
        const enabledWeekdays = period.enabledWeekdays.filter((weekday): weekday is ContractWeekday => ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].includes(weekday))
        return isContractEnabledOn({ ...period, id: period.id ?? 'period', autoRenew: period.autoRenew ?? false, enabledWeekdays }, date)
      })
    })
  }
  return legacyPatternEligible(customer.orderPattern, new Date(`${date.slice(0, 10)}T00:00:00`))
}
