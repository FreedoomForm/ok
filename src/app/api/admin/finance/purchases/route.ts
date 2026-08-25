import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { purchaseRequestSchema } from '@/lib/admin/purchases'

const purchasePatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  deletedAt: z.boolean().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    amount: z.number().finite().positive().max(1_000_000),
    costPerUnit: z.number().finite().nonnegative().max(1_000_000_000),
    unit: z.string().trim().min(1).max(32),
  })).min(1).max(200).optional(),
}).strict()

async function logPurchaseAction(adminId: string, action: string, purchaseId: string, oldValues: Record<string, unknown>, newValues: Record<string, unknown>) {
  await db.actionLog.create({
    data: { adminId, action, entityType: 'PURCHASE', entityId: purchaseId, oldValues: JSON.stringify(oldValues), newValues: JSON.stringify(newValues) },
  })
}

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
  return { user, ownerAdminId }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = purchaseRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase payload' }, { status: 400 })
    const { items, title, idempotencyKey } = parsed.data
    const totalCost = items.reduce((sum, item) => sum + item.amount * item.costPerUnit, 0)
    if (idempotencyKey) {
      const existing = await db.purchase.findFirst({ where: { ownerAdminId: scope.ownerAdminId, idempotencyKey }, include: { items: true } })
      if (existing) return NextResponse.json({ purchase: existing })
    }
    const purchase = await db.purchase.create({
      data: {
        ownerAdminId: scope.ownerAdminId,
        title: title ?? 'Ingredient purchase list',
        idempotencyKey: idempotencyKey ?? null,
        totalCost,
        status: 'DRAFT',
        deletedAt: null,
        items: { create: items.map((item) => ({ name: item.name, amount: item.amount, unit: item.unit, costPerUnit: item.costPerUnit, totalCost: item.amount * item.costPerUnit })) },
      },
      include: { items: true },
    })
    return NextResponse.json({ purchase }, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase draft:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const showDeleted = searchParams.get('showDeleted') === 'true'
    const purchases = await db.purchase.findMany({
      where: {
        ownerAdminId: scope.ownerAdminId,
        ...(showDeleted ? { deletedAt: { not: null } } : { deletedAt: null }),
        ...(status === 'DRAFT' || status === 'COMPLETED' ? { status } : {}),
      },
      include: {
        items: { orderBy: { name: 'asc' } },
        transaction: { select: { id: true, amount: true, type: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ purchases })
  } catch (error) {
    console.error('Error listing purchases:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = purchasePatchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase update' }, { status: 400 })
    const { id, deletedAt, title, items } = parsed.data
    const current = await db.purchase.findFirst({ where: { id, ownerAdminId: scope.ownerAdminId }, include: { items: true } })
    if (!current) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    if (items && current.status !== 'DRAFT') return NextResponse.json({ error: 'Completed purchases cannot be edited' }, { status: 409 })
    const totalCost = items?.reduce((sum, item) => sum + item.amount * item.costPerUnit, 0)
    const updated = await db.$transaction(async (tx) => {
      if (items) await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })
      return tx.purchase.update({
        where: { id },
        data: {
          ...(title === undefined ? {} : { title }),
          ...(deletedAt === undefined ? {} : { deletedAt: deletedAt ? new Date() : null }),
          ...(totalCost === undefined ? {} : { totalCost }),
          ...(items ? { items: { create: items.map((item) => ({ ...item, totalCost: item.amount * item.costPerUnit })) } } : {}),
        },
        include: { items: true, transaction: { select: { id: true, amount: true, type: true, createdAt: true } } },
      })
    })
    try {
      await logPurchaseAction(scope.user.id, deletedAt === true ? 'DELETE_PURCHASE' : deletedAt === false ? 'RESTORE_PURCHASE' : 'UPDATE_PURCHASE', id, { title: current.title, status: current.status, deletedAt: current.deletedAt }, { title: updated.title, status: updated.status, deletedAt: updated.deletedAt })
    } catch (error) {
      console.error('Failed to log purchase update:', error)
    }
    return NextResponse.json({ purchase: updated })
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!id) return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 })
    const current = await db.purchase.findFirst({ where: { id, ownerAdminId: scope.ownerAdminId } })
    if (!current) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    const deleted = await db.purchase.update({ where: { id }, data: { deletedAt: new Date() } })
    try {
      await logPurchaseAction(scope.user.id, 'DELETE_PURCHASE', id, { deletedAt: current.deletedAt }, { deletedAt: deleted.deletedAt })
    } catch (error) {
      console.error('Failed to log purchase deletion:', error)
    }
    return NextResponse.json({ purchase: deleted })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
