import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { z } from 'zod'

const bodySchema = z.object({ virtualCardId: z.string().min(1).optional() }).optional()
const massUnits: Record<string, number> = { mg: 0.001, gr: 1, g: 1, kg: 1000 }
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 }
const countUnits: Record<string, number> = { pcs: 1, pc: 1, dona: 1 }
function normalizeUnit(unit: string) {
  const value = unit.trim().toLowerCase()
  return value === 'g' ? 'gr' : value === 'pc' || value === 'sht' ? 'pcs' : value
}
function convertAmount(amount: number, fromUnit: string, toUnit: string) {
  const from = normalizeUnit(fromUnit); const to = normalizeUnit(toUnit)
  if (from === to) return amount
  if (massUnits[from] && massUnits[to]) return amount * massUnits[from] / massUnits[to]
  if (volumeUnits[from] && volumeUnits[to]) return amount * volumeUnits[from] / volumeUnits[to]
  if (countUnits[from] && countUnits[to]) return amount
  return null
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
    const { id } = await context.params
    const body = bodySchema.parse(await request.json().catch(() => undefined))
    const result = await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({ where: { id, ownerAdminId }, include: { items: true } })
      if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
      if (purchase.status === 'COMPLETED' && purchase.transactionId) return purchase
      const totalCost = purchase.items.reduce((sum, item) => sum + item.totalCost, 0)
      if (body?.virtualCardId) {
        const updated = await tx.virtualCard.updateMany({ where: { id: body.virtualCardId, ownerAdminId, isActive: true, balance: { gte: totalCost } }, data: { balance: { decrement: totalCost } } })
        if (updated.count !== 1) throw new Error('INSUFFICIENT_CARD_BALANCE')
      } else {
        const updated = await tx.admin.updateMany({ where: { id: ownerAdminId, companyBalance: { gte: totalCost } }, data: { companyBalance: { decrement: totalCost } } })
        if (updated.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
      }
      for (const item of purchase.items) {
        const unit = normalizeUnit(item.unit)
        const existing = await tx.warehouseItem.findUnique({ where: { name: item.name } })
        if (!existing) {
          await tx.warehouseItem.create({ data: { name: item.name, amount: item.amount, unit, pricePerUnit: item.costPerUnit, priceUnit: unit } })
          continue
        }
        const converted = convertAmount(item.amount, unit, existing.unit)
        if (converted === null) throw new Error('UNIT_MISMATCH')
        await tx.warehouseItem.update({ where: { id: existing.id }, data: { amount: { increment: converted }, pricePerUnit: item.costPerUnit, priceUnit: unit } })
      }
      const transaction = await tx.transaction.create({ data: { amount: totalCost, type: 'EXPENSE', category: 'INGREDIENT_PURCHASE', description: `Ingredient purchase: ${purchase.title}`, adminId: user.id, virtualCardId: body?.virtualCardId ?? null } })
      return tx.purchase.update({ where: { id: purchase.id }, data: { status: 'COMPLETED', completedAt: new Date(), transactionId: transaction.id }, include: { items: true, transaction: true } })
    })
    return NextResponse.json({ success: true, purchase: result })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
      if (error.message === 'INSUFFICIENT_CARD_BALANCE') return NextResponse.json({ error: 'Insufficient virtual card balance' }, { status: 400 })
      if (error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
      if (error.message === 'UNIT_MISMATCH') return NextResponse.json({ error: 'Unit mismatch' }, { status: 400 })
    }
    console.error('Error completing purchase:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
