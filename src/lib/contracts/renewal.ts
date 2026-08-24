import { db } from '@/lib/db'
import { nextRenewalPeriod, type ContractPeriodDraft } from './periods'

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export async function ensureContractRenewedForDate(contractId: string, targetDate: Date) {
  let created = 0
  for (let attempt = 0; attempt < 52; attempt += 1) {
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: { periods: { orderBy: { endDate: 'desc' }, take: 1 } },
    })
    const previous = contract?.periods[0]
    if (!contract || !previous || contract.status !== 'ENABLED' || !contract.autoRenew || !previous.autoRenew || previous.status !== 'ENABLED') return created
    if (previous.endDate >= targetDate) return created

    const draft: ContractPeriodDraft = {
      id: previous.id,
      startDate: previous.startDate.toISOString().slice(0, 10),
      endDate: previous.endDate.toISOString().slice(0, 10),
      autoRenew: true,
      enabledWeekdays: asStrings(previous.enabledWeekdays) as ContractPeriodDraft['enabledWeekdays'],
      disabledDates: asStrings(previous.disabledDates),
    }
    const next = nextRenewalPeriod(draft)
    if (!next) return created
    const startDate = new Date(`${next.startDate}T00:00:00.000Z`)
    const endDate = new Date(`${next.endDate}T00:00:00.000Z`)
    const existing = await db.contractPeriod.findFirst({ where: { contractId, startDate, endDate }, select: { id: true } })
    if (!existing) {
      await db.contractPeriod.create({
        data: {
          contractId,
          courierId: previous.courierId,
          startDate,
          endDate,
          status: 'ENABLED',
          paid: false,
          autoRenew: true,
          enabledWeekdays: next.enabledWeekdays,
          disabledDates: next.disabledDates,
        },
      })
      created += 1
    }
  }
  return created
}
