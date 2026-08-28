import { Prisma, PrismaClient } from '@prisma/client'
import { nextRenewalPeriod, type ContractPeriodDraft } from './periods'

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function isRetryableSerializationFailure(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  return error.code === 'P2034' || (error.code === 'P2010' && error.message.includes('40001'))
}

export async function renewOneContractPeriodInTransaction(tx: Prisma.TransactionClient, contractId: string, targetDate: Date) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "contracts"
    WHERE "id" = ${contractId}
    FOR UPDATE
  `)

  const contract = await tx.contract.findUnique({ where: { id: contractId }, include: { periods: { orderBy: { endDate: 'desc' }, take: 1 } } })
  const previous = contract?.periods[0]
  if (!contract || !previous || contract.status !== 'ENABLED' || !contract.autoRenew || !previous.autoRenew || previous.status !== 'ENABLED') return false
  if (previous.endDate >= targetDate) return false

  const draft: ContractPeriodDraft = {
    id: previous.id,
    startDate: previous.startDate.toISOString().slice(0, 10),
    endDate: previous.endDate.toISOString().slice(0, 10),
    autoRenew: true,
    enabledWeekdays: asStrings(previous.enabledWeekdays) as ContractPeriodDraft['enabledWeekdays'],
    disabledDates: asStrings(previous.disabledDates),
  }
  const next = nextRenewalPeriod(draft)
  if (!next) return false

  await tx.contractPeriod.create({
    data: {
      contractId,
      courierId: previous.courierId,
      startDate: new Date(`${next.startDate}T00:00:00.000Z`),
      endDate: new Date(`${next.endDate}T00:00:00.000Z`),
      status: 'ENABLED',
      paid: false,
      autoRenew: true,
      enabledWeekdays: next.enabledWeekdays,
      disabledDates: next.disabledDates,
    },
  })
  return true
}

export async function renewOneContractPeriodWithRetry(db: PrismaClient, contractId: string, targetDate: Date, maxAttempts = 5) {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await db.$transaction((tx) => renewOneContractPeriodInTransaction(tx, contractId, targetDate), { isolationLevel: 'Serializable' })
    } catch (error) {
      lastError = error
      if (!isRetryableSerializationFailure(error) || attempt === maxAttempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function ensureFutureContractPeriods(db: PrismaClient, targetDate: Date) {
  const contracts = await db.contract.findMany({ where: { status: 'ENABLED', autoRenew: true, customer: { isActive: true, deletedAt: null } }, select: { id: true } })
  let created = 0
  for (const contract of contracts) {
    while (await renewOneContractPeriodWithRetry(db, contract.id, targetDate)) created += 1
  }
  return created
}
