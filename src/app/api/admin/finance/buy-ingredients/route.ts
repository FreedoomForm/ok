import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { purchaseRequestSchema } from '@/lib/admin/purchases'
import { completePurchaseWithRetry } from '@/lib/admin/purchase-completion'

export async function POST(request: NextRequest) {
  let ownerAdminId: string | null = null
  let actorAdminId: string | null = null
  let selectedVirtualCardId: string | undefined
  let idempotencyKey: string | null = null
  try {
    const user = await getAuthUser(request)
    if (!user || !canManageGlobalOperationalResource(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = purchaseRequestSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 })

    const { items, virtualCardId, title } = validation.data
    selectedVirtualCardId = virtualCardId
    idempotencyKey = validation.data.idempotencyKey ?? null
    ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
    actorAdminId = user.id

    const existing = idempotencyKey
      ? await db.purchase.findFirst({ where: { ownerAdminId, idempotencyKey }, include: { transaction: true, items: true } })
      : null
    if (existing?.transaction) return NextResponse.json({ success: true, transaction: existing.transaction, purchase: existing })

    const purchase = existing ?? await db.purchase.create({
      data: {
        ownerAdminId,
        idempotencyKey,
        title: title ?? 'Ingredient purchase',
        items: { create: items.map((item) => ({ name: item.name, amount: item.amount, unit: item.unit, kcalPerGram: item.kcalPerGram ?? null, costPerUnit: item.costPerUnit, totalCost: item.amount * item.costPerUnit })) },
      },
      include: { items: true, transaction: true },
    })
    const completed = await completePurchaseWithRetry(db, { purchaseId: purchase.id, ownerAdminId, actorAdminId, virtualCardId })
    return NextResponse.json({ success: true, transaction: completed.transaction, purchase: completed })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && ownerAdminId && idempotencyKey) {
      const existing = await db.purchase.findFirst({ where: { ownerAdminId, idempotencyKey }, include: { transaction: true, items: true } })
      if (existing?.transaction) return NextResponse.json({ success: true, transaction: existing.transaction, purchase: existing })
      if (existing) {
        try {
          const completed = await completePurchaseWithRetry(db, { purchaseId: existing.id, ownerAdminId, actorAdminId: actorAdminId ?? ownerAdminId, virtualCardId: selectedVirtualCardId })
          return NextResponse.json({ success: true, transaction: completed.transaction, purchase: completed })
        } catch (retryError) {
          error = retryError
        }
      }
    }
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
      if (error.message === 'INSUFFICIENT_CARD_BALANCE') return NextResponse.json({ error: 'Insufficient virtual card balance' }, { status: 400 })
      if (error.message === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
      if (error.message === 'UNIT_MISMATCH') return NextResponse.json({ error: 'Purchase unit does not match warehouse unit' }, { status: 400 })
    }
    console.error('Error buying ingredients:', error)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}
