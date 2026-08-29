import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { getOwnerAdminId } from '@/lib/admin-scope'

const cardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

const patchSchema = cardSchema.partial().extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  deletedAt: z.boolean().optional(),
})

type SerializedCard = {
  id: string
  name: string
  color: string
  balance: number
  isActive: boolean
  deletedAt: Date | null
  createdAt: Date
  transactions: Array<{ id: string; amount: number; type: string; description: string | null; createdAt: Date }>
}

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
  return { user, ownerAdminId }
}

function serializeCard(card: SerializedCard) {
  return {
    id: card.id,
    name: card.name,
    color: card.color,
    balance: card.balance,
    isActive: card.isActive,
    deletedAt: card.deletedAt,
    createdAt: card.createdAt,
    transactions: card.transactions,
  }
}

async function logCardAction(adminId: string, action: string, card: SerializedCard, oldValues: object, newValues: object) {
  try {
    await db.actionLog.create({
      data: {
        adminId,
        action,
        entityType: 'VIRTUAL_CARD',
        entityId: card.id,
        details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: action, entity: 'VIRTUAL_CARD' } }),
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify(newValues),
        description: `${action === 'CREATE_VIRTUAL_CARD' ? 'Created' : action === 'DELETE_VIRTUAL_CARD' ? 'Deleted' : 'Updated'} virtual card: ${card.name}`,
      },
    })
  } catch (error) {
    console.error('Failed to log virtual card action:', error)
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
    const serialized = serializeCard({ ...card, transactions: [] })
    await logCardAction(scope.user.id, 'CREATE_VIRTUAL_CARD', { ...card, transactions: [] }, {}, { name: card.name, color: card.color, isActive: card.isActive })
    return NextResponse.json({ card: serialized }, { status: 201 })
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
    const { id, deletedAt, ...data } = parsed.data
    const card = await db.virtualCard.findFirst({ where: { id, ownerAdminId: scope.ownerAdminId } })
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    const updateData = {
      ...data,
      ...(deletedAt === undefined ? {} : { deletedAt: deletedAt ? new Date() : null, isActive: deletedAt ? false : data.isActive ?? true }),
    }
    const updated = await db.virtualCard.update({ where: { id }, data: updateData })
    await logCardAction(scope.user.id, deletedAt === true ? 'DELETE_VIRTUAL_CARD' : 'UPDATE_VIRTUAL_CARD', { ...updated, transactions: [] }, { name: card.name, color: card.color, isActive: card.isActive, deletedAt: card.deletedAt }, { name: updated.name, color: updated.color, isActive: updated.isActive, deletedAt: updated.deletedAt })
    return NextResponse.json({ card: serializeCard({ ...updated, transactions: [] }) })
  } catch (error) {
    console.error('Error updating virtual card:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = request.nextUrl.searchParams.get('id') || ''
    if (!id) return NextResponse.json({ error: 'Card id is required' }, { status: 400 })
    const card = await db.virtualCard.findFirst({ where: { id, ownerAdminId: scope.ownerAdminId } })
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    const deleted = await db.virtualCard.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logCardAction(scope.user.id, 'DELETE_VIRTUAL_CARD', { ...deleted, transactions: [] }, { name: card.name, color: card.color, isActive: card.isActive, deletedAt: card.deletedAt }, { name: deleted.name, color: deleted.color, isActive: deleted.isActive, deletedAt: deleted.deletedAt })
    return NextResponse.json({ card: serializeCard({ ...deleted, transactions: [] }) })
  } catch (error) {
    console.error('Error deleting virtual card:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
