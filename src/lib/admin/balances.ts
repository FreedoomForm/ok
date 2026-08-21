import { Prisma } from '@prisma/client'

export const MAX_BALANCE_RANGE_DAYS = 366

export function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function diffDaysInclusiveUtc(from: Date, to: Date) {
  const fromDay = startOfDayUtc(from).getTime()
  const toDay = startOfDayUtc(to).getTime()
  const diff = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff + 1)
}

export function buildSalaryAdminWhere(groupAdminIds: readonly string[] | null): Prisma.AdminWhereInput {
  return {
    role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] },
    ...(groupAdminIds ? { createdBy: { in: [...groupAdminIds] } } : {}),
  }
}

export function parseBalanceDates(
  asOfRaw: string | null,
  fromRaw: string | null,
  toRaw: string | null,
  now = new Date(),
) {
  const parse = (value: string | null) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const asOf = asOfRaw ? parse(asOfRaw) : now
  const fromDate = parse(fromRaw)
  const toDate = parse(toRaw)
  if (!asOf || (asOfRaw && !asOf) || (fromRaw && !fromDate) || (toRaw && !toDate)) {
    return { error: 'Invalid date parameter' as const }
  }

  const from = fromDate ? startOfDayUtc(fromDate) : null
  const to = toDate
    ? new Date(startOfDayUtc(toDate).getTime() + 24 * 60 * 60 * 1000)
    : from
      ? new Date(from.getTime() + 24 * 60 * 60 * 1000)
      : null

  if (from && to) {
    const rangeDays = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
    if (rangeDays < 1 || rangeDays > MAX_BALANCE_RANGE_DAYS) {
      return { error: `Date range must be between 1 and ${MAX_BALANCE_RANGE_DAYS} days` as const }
    }
  }

  return { asOf, from, to }
}
