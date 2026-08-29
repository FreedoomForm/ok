import { Prisma, PrismaClient } from '@prisma/client'
import { nextRenewalPeriod, type ContractPeriodDraft } from './periods'
import { buildContractRenewalAuditDetails } from './renewal-audit'

export type ManualRenewalOutcomeKind = 'NOT_FOUND' | 'NO_PERIOD' | 'RENEWAL_DISABLED' | 'ALREADY_EXISTS' | 'CREATED' 

export interface ManualRenewalInput {
  contractId: string
  actorAdminId: string
  groupAdminIds: readonly string[] | null
  correlationKey?: string | null
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * Scope-aware manual contract-period renewal core. Resolves the contract
 * within the actor's admin group scope, computes the next seven-day period
 * from the latest existing one and creates it idempotently: a pre-check and a
 * P2002 fallback both resolve to ALREADY_EXISTS without writing anything, and
 * every created period emits a MANUAL RENEW_CONTRACT_PERIOD audit row with the
 * optional correlation key inside the same serializable transaction.
 */
export async function renewContractPeriodManually<TPeriod = { id: string }>(
  db: PrismaClient,
  input: ManualRenewalInput,
): Promise<
  | { kind: 'NOT_FOUND' }
  | { kind: 'NO_PERIOD' }
  | { kind: 'RENEWAL_DISABLED' }
  | { kind: 'ALREADY_EXISTS'; period: TPeriod }
  | { kind: 'CREATED'; period: TPeriod }
> {
  const contract = await db.contract.findFirst({
    where: {
      id: input.contractId,
      ...(input.groupAdminIds ? { ownerAdminId: { in: [...input.groupAdminIds] } } : {}),
    },
    include: { periods: { orderBy: { endDate: 'desc' }, take: 1 } },
  })
  if (!contract) return { kind: 'NOT_FOUND' }
  const previous = contract.periods[0]
  if (!previous) return { kind: 'NO_PERIOD' }
  if (contract.status !== 'ENABLED' || !contract.autoRenew || !previous.autoRenew || previous.status !== 'ENABLED') {
    return { kind: 'RENEWAL_DISABLED' }
  }

  const draft: ContractPeriodDraft = {
    id: previous.id,
    startDate: previous.startDate.toISOString().slice(0, 10),
    endDate: previous.endDate.toISOString().slice(0, 10),
    autoRenew: true,
    enabledWeekdays: asStrings(previous.enabledWeekdays) as ContractPeriodDraft['enabledWeekdays'],
    disabledDates: asStrings(previous.disabledDates),
  }
  const next = nextRenewalPeriod(draft)
  if (!next) return { kind: 'RENEWAL_DISABLED' }

  const startAt = new Date(`${next.startDate}T00:00:00.000Z`)
  const endAt = new Date(`${next.endDate}T00:00:00.000Z`)

  const existing = await db.contractPeriod.findFirst({ where: { contractId: contract.id, startDate: startAt, endDate: endAt } })
  if (existing) return { kind: 'ALREADY_EXISTS', period: existing as unknown as TPeriod }

  try {
    const created = await db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "contracts"
        WHERE "id" = ${contract.id}
        FOR UPDATE
      `)
      const period = await tx.contractPeriod.create({
        data: {
          contractId: contract.id,
          courierId: previous.courierId,
          startDate: startAt,
          endDate: endAt,
          status: 'ENABLED',
          paid: false,
          autoRenew: true,
          enabledWeekdays: next.enabledWeekdays,
          disabledDates: next.disabledDates,
        },
      })
      await tx.actionLog.create({
        data: {
          adminId: input.actorAdminId,
          action: 'RENEW_CONTRACT_PERIOD',
          entityType: 'CONTRACT',
          entityId: contract.id,
          oldValues: JSON.stringify({ previousPeriodId: previous.id, startDate: draft.startDate, endDate: draft.endDate }),
          newValues: JSON.stringify({ periodId: period.id, startDate: next.startDate, endDate: next.endDate, status: 'ENABLED', paid: false }),
          details: buildContractRenewalAuditDetails({
            result: 'CREATED',
            source: 'MANUAL',
            startDate: next.startDate,
            endDate: next.endDate,
            correlationKey: input.correlationKey,
          }),
        },
      })
      return period
    }, { isolationLevel: 'Serializable' })
    return { kind: 'CREATED', period: created as unknown as TPeriod }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await db.contractPeriod.findFirst({ where: { contractId: contract.id, startDate: startAt, endDate: endAt } })
      if (raced) return { kind: 'ALREADY_EXISTS', period: raced as unknown as TPeriod }
    }
    throw error
  }
}
