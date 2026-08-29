import { Prisma, PrismaClient } from '@prisma/client'

const massUnits: Record<string, number> = { mg: 0.001, gr: 1, g: 1, kg: 1000 }
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 }
const countUnits: Record<string, number> = { pcs: 1, pc: 1, dona: 1 }

function normalizeUnit(unit: string) {
  const value = unit.trim().toLowerCase()
  return value === 'g' ? 'gr' : value === 'pc' || value === 'sht' ? 'pcs' : value
}

function convertAmount(amount: number, fromUnit: string, toUnit: string) {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return amount
  if (massUnits[from] && massUnits[to]) return amount * massUnits[from] / massUnits[to]
  if (volumeUnits[from] && volumeUnits[to]) return amount * volumeUnits[from] / volumeUnits[to]
  if (countUnits[from] && countUnits[to]) return amount
  return null
}

export type PurchaseCompletionInput = {
  purchaseId: string
  ownerAdminId: string
  actorAdminId: string
  virtualCardId?: string
  idempotencyKey?: string
}

export function buildPurchaseCompletionAuditDetails(input: { idempotencyKey?: string } = {}): string {
  const raw = input.idempotencyKey
  if (raw === undefined) {
    return JSON.stringify({ result: 'SUCCESS', idempotencyKey: null })
  }
  const key = raw.trim()
  if (key.length < 8 || key.length > 120) {
    throw new Error('INVALID_IDEMPOTENCY_KEY')
  }
  return JSON.stringify({ result: 'SUCCESS', idempotencyKey: key })
}

function isRetryableSerializationFailure(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  return error.code === 'P2034' || (error.code === 'P2010' && error.message.includes('40001'))
}

export async function completePurchaseWithRetry(db: PrismaClient, input: PurchaseCompletionInput, maxAttempts = 5) {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await db.$transaction((tx) => completePurchaseInTransaction(tx, input), { isolationLevel: 'Serializable' })
    } catch (error) {
      lastError = error
      if (!isRetryableSerializationFailure(error) || attempt === maxAttempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function completePurchaseInTransaction(tx: Prisma.TransactionClient, input: PurchaseCompletionInput) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "purchases"
    WHERE "id" = ${input.purchaseId}
      AND "ownerAdminId" = ${input.ownerAdminId}
      AND "deletedAt" IS NULL
    FOR UPDATE
  `)

  const purchase = await tx.purchase.findFirst({ where: { id: input.purchaseId, ownerAdminId: input.ownerAdminId, deletedAt: null }, include: { items: true, transaction: true } })
  if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
  if (purchase.status === 'COMPLETED' && purchase.transactionId) return purchase

  const totalCost = purchase.items.reduce((sum, item) => sum + item.totalCost, 0)
  if (input.virtualCardId) {
    const updated = await tx.virtualCard.updateMany({ where: { id: input.virtualCardId, ownerAdminId: input.ownerAdminId, isActive: true, deletedAt: null, balance: { gte: totalCost } }, data: { balance: { decrement: totalCost } } })
    if (updated.count !== 1) throw new Error('INSUFFICIENT_CARD_BALANCE')
  } else {
    const updated = await tx.admin.updateMany({ where: { id: input.ownerAdminId, companyBalance: { gte: totalCost } }, data: { companyBalance: { decrement: totalCost } } })
    if (updated.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
  }

  for (const item of purchase.items) {
    const unit = normalizeUnit(item.unit)
    const existing = await tx.warehouseItem.findUnique({ where: { name: item.name } })
    if (!existing) {
      await tx.warehouseItem.create({ data: { name: item.name, amount: item.amount, unit, kcalPerGram: item.kcalPerGram ?? null, pricePerUnit: item.costPerUnit, priceUnit: unit } })
      continue
    }
    const converted = convertAmount(item.amount, unit, existing.unit)
    if (converted === null) throw new Error(`UNIT_MISMATCH:${item.name}:${unit}->${existing.unit}`)
    await tx.warehouseItem.update({ where: { id: existing.id }, data: { amount: { increment: converted }, ...(item.kcalPerGram === null || item.kcalPerGram === undefined ? {} : { kcalPerGram: item.kcalPerGram }), pricePerUnit: item.costPerUnit, priceUnit: unit } })
  }

  const transaction = await tx.transaction.create({ data: { amount: totalCost, type: 'EXPENSE', category: 'INGREDIENT_PURCHASE', description: `Ingredient purchase: ${purchase.title}`, adminId: input.actorAdminId, virtualCardId: input.virtualCardId ?? null } })
  const completed = await tx.purchase.update({ where: { id: purchase.id }, data: { status: 'COMPLETED', completedAt: new Date(), transactionId: transaction.id }, include: { items: true, transaction: true } })
  await tx.actionLog.create({ data: { adminId: input.actorAdminId, action: 'COMPLETE_PURCHASE', entityType: 'PURCHASE', entityId: purchase.id, oldValues: JSON.stringify({ status: purchase.status, totalCost: purchase.totalCost }), newValues: JSON.stringify({ status: completed.status, totalCost: completed.totalCost, transactionId: transaction.id, virtualCardId: input.virtualCardId ?? null }), details: buildPurchaseCompletionAuditDetails({ idempotencyKey: input.idempotencyKey }) } })
  return completed
}
