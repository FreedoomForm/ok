import { isCustomerScheduledOn, type SchedulableCustomer } from '@/lib/contracts/effective-schedule'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

type DeliveryDays = Partial<Record<(typeof WEEKDAYS)[number], boolean>>

type AutoOrderCustomer = Omit<SchedulableCustomer, 'autoOrdersEnabled'> & {
  autoOrdersEnabled?: boolean
  deliveryDays?: DeliveryDays | null
  disabledDates?: readonly string[] | null
}

function dateKey(date: string): string {
  return date.slice(0, 10)
}

function weekdayKey(date: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[new Date(`${dateKey(date)}T00:00:00`).getDay()]
}

export function isAutoOrderEligibleOn(customer: AutoOrderCustomer, date: string): boolean {
  if (!customer.autoOrdersEnabled) return false
  const key = dateKey(date)
  if (customer.disabledDates?.some((disabledDate) => dateKey(disabledDate) === key)) return false
  const deliveryDays = customer.deliveryDays
  if (deliveryDays && Object.keys(deliveryDays).length > 0 && deliveryDays[weekdayKey(key)] !== true) return false
  return isCustomerScheduledOn({ ...customer, autoOrdersEnabled: customer.autoOrdersEnabled ?? true }, key)
}

export type { AutoOrderCustomer, DeliveryDays }
