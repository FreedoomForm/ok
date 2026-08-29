import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { z } from 'zod'
import { completePurchaseWithRetry } from '@/lib/admin/purchase-completion'

const bodySchema = z.object({
  virtualCardId: z.string().min(1).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
}).optional()

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
    const { id } = await context.params
    const body = bodySchema.parse(await request.json().catch(() => undefined))
    const result = await completePurchaseWithRetry(db, { purchaseId: id, ownerAdminId, actorAdminId: user.id, virtualCardId: body?.virtualCardId, idempotencyKey: body?.idempotencyKey })
    return NextResponse.json({ success: true, purchase: result })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid completion payload' }, { status: 400 })
    if (error instanceof Error) {
      if (error.message === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
      if (error.message === 'INSUFFICIENT_CARD_BALANCE') return NextResponse.json({ error: 'Insufficient virtual card balance' }, { status: 400 })
      if (error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
      if (error.message.startsWith('UNIT_MISMATCH')) {
        const detail = error.message.slice('UNIT_MISMATCH'.length)
        return NextResponse.json({ error: `Unit mismatch${detail}` }, { status: 400 })
      }
    }
    console.error('Error completing purchase:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
