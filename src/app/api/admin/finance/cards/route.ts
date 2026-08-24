import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'

const cardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

const patchSchema = cardSchema.partial().extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
})

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
  return { user, ownerAdminId }
}

function serializeCard(card: {
  id: string
  name: string
  color: string
  balance: number
  isActive: boolean
  createdAt: Date
  transactions: Array<{ id: string; amount: number; type: string; description: string | null; createdAt: Date }>
}) {
  return {
    id: card.id,
    name: card.name,
    color: card.color,
    balance: card.balance,
    isActive: card.isActive,
    createdAt: card.createdAt,
    transactions: card.transactions,
  }
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const cards = await db.virtualCard.findMany({
      where: { ownerAdminId: scope.ownerAdminId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, amount: true, type: true, description: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ cards: cards.map(serializeCard) })
  } catch (error) {
    console.error('Error listing virtual cards:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = cardSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid card payload' }, { status: 400 })
    const card = await db.virtualCard.create({ data: { ownerAdminId: scope.ownerAdminId, ...parsed.data } })
    return NextResponse.json({ card: serializeCard({ ...card, transactions: [] }) }, { status: 201 })
  } catch (error) {
    console.error('Error creating virtual card:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid card payload' }, { status: 400 })
    const { id, ...data } = parsed.data
    const card = await db.virtualCard.findFirst({ where: { id, ownerAdminId: scope.ownerAdminId } })
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    const updated = await db.virtualCard.update({ where: { id }, data })
    return NextResponse.json({ card: serializeCard({ ...updated, transactions: [] }) })
  } catch (error) {
    console.error('Error updating virtual card:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
