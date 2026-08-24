import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { purchaseRequestSchema } from '@/lib/admin/purchases'

const normalizeUnit = (unit: string): string => {
  const value = unit.trim().toLowerCase()
  if (value === 'g') return 'gr'
  if (value === 'pc' || value === 'sht' || value === 'don' || value === "bo'lak") return 'pcs'
  return value
}

const massUnits: Record<string, number> = { mg: 0.001, gr: 1, kg: 1000 }
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 }
const countUnits: Record<string, number> = { pcs: 1, dona: 1 }

const convertAmount = (amount: number, fromUnit: string, toUnit: string): number | null => {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return amount
  if (massUnits[from] && massUnits[to]) return (amount * massUnits[from]) / massUnits[to]
  if (volumeUnits[from] && volumeUnits[to]) return (amount * volumeUnits[from]) / volumeUnits[to]
  if (countUnits[from] && countUnits[to]) return amount
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = purchaseRequestSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 })

    const { items, virtualCardId, idempotencyKey, title } = validation.data
    const adminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
    const totalCost = items.reduce((sum, item) => sum + item.amount * item.costPerUnit, 0)

    if (idempotencyKey) {
      const existing = await db.purchase.findFirst({
        where: { ownerAdminId: adminId, idempotencyKey },
        include: { transaction: true, items: true },
      })
      if (existing?.transaction) return NextResponse.json({ success: true, transaction: existing.transaction, purchase: existing })
    }

    const result = await db.$transaction(async (tx) => {
      const adminExists = await tx.admin.findUnique({ where: { id: adminId }, select: { id: true } })
      if (!adminExists) throw new Error('ADMIN_NOT_FOUND')

      let selectedCardId: string | null = null
      if (virtualCardId) {
        const debitedCard = await tx.virtualCard.updateMany({
          where: { id: virtualCardId, ownerAdminId: adminId, isActive: true, balance: { gte: totalCost } },
          data: { balance: { decrement: totalCost } },
        })
        if (debitedCard.count !== 1) throw new Error('INSUFFICIENT_CARD_BALANCE')
        selectedCardId = virtualCardId
      } else {
        const debitedCompany = await tx.admin.updateMany({
          where: { id: adminId, companyBalance: { gte: totalCost } },
          data: { companyBalance: { decrement: totalCost } },
        })
        if (debitedCompany.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
      }

      const description = `Ingredient purchase: ${items.map((item) => `${item.name} (${item.amount}${item.unit})`).join(', ')}`
      const transaction = await tx.transaction.create({
        data: {
          amount: totalCost,
          type: 'EXPENSE',
          category: 'INGREDIENT_PURCHASE',
          description,
          adminId,
          virtualCardId: selectedCardId,
        },
      })

      for (const purchased of items) {
        const unit = normalizeUnit(purchased.unit)
        const existing = await tx.warehouseItem.findUnique({ where: { name: purchased.name } })
        if (!existing) {
          await tx.warehouseItem.create({
            data: {
              name: purchased.name,
              amount: purchased.amount,
              unit,
              kcalPerGram: purchased.kcalPerGram ?? null,
              pricePerUnit: purchased.costPerUnit,
              priceUnit: unit,
            },
          })
          continue
        }

        const convertedAmount = convertAmount(purchased.amount, unit, existing.unit)
        if (convertedAmount === null) throw new Error(`UNIT_MISMATCH:${purchased.name}:${existing.unit}:${unit}`)
        await tx.warehouseItem.update({
          where: { name: purchased.name },
          data: {
            amount: { increment: convertedAmount },
            ...(purchased.kcalPerGram !== undefined ? { kcalPerGram: purchased.kcalPerGram } : {}),
            pricePerUnit: purchased.costPerUnit,
            priceUnit: unit,
            updatedAt: new Date(),
          },
        })
      }

      const purchase = await tx.purchase.create({
        data: {
          ownerAdminId: adminId,
          transactionId: transaction.id,
          idempotencyKey: idempotencyKey ?? null,
          title: title ?? 'Ingredient purchase',
          status: 'COMPLETED',
          totalCost,
          completedAt: new Date(),
          items: {
            create: items.map((item) => ({
              name: item.name,
              amount: item.amount,
              unit: normalizeUnit(item.unit),
              costPerUnit: item.costPerUnit,
              totalCost: item.amount * item.costPerUnit,
            })),
          },
        },
        include: { items: true },
      })

      await tx.actionLog.create({
        data: {
          adminId: user.id,
          action: 'BUY_INGREDIENTS',
          entityType: 'TRANSACTION',
          entityId: transaction.id,
          description: 'Bought ingredients',
        },
      })

      return { transaction, purchase }
    })

    return NextResponse.json({ success: true, transaction: result.transaction, purchase: result.purchase })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
      if (error.message === 'INSUFFICIENT_CARD_BALANCE') return NextResponse.json({ error: 'Insufficient virtual card balance' }, { status: 400 })
      if (error.message === 'ADMIN_NOT_FOUND') return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      if (error.message.startsWith('UNIT_MISMATCH:')) {
        const [, name, existingUnit, newUnit] = error.message.split(':')
        return NextResponse.json({ error: `Unit mismatch for ${name}: warehouse uses ${existingUnit}, attempted to buy in ${newUnit}` }, { status: 400 })
      }
    }
    console.error('Error buying ingredients:', error)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}
