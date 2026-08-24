import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { purchaseRequestSchema } from '@/lib/admin/purchases'

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
    const purchases = await db.purchase.findMany({
      where: {
        ownerAdminId: scope.ownerAdminId,
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
