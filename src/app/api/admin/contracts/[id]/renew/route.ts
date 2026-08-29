import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { renewContractPeriodManually } from '@/lib/contracts/renewal-manual'

const bodySchema = z.object({
  correlationKey: z.string().trim().min(8).max(120).optional(),
}).optional()

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const scope = { groupAdminIds: await getGroupAdminIds(user) }
    const { id } = await context.params
    const body = bodySchema.parse(await request.json().catch(() => undefined))
    const outcome = await renewContractPeriodManually(db, { contractId: id, actorAdminId: user.id, groupAdminIds: scope.groupAdminIds, correlationKey: body?.correlationKey })
    if (outcome.kind === 'NOT_FOUND') return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    if (outcome.kind === 'NO_PERIOD') return NextResponse.json({ error: 'Contract has no period' }, { status: 409 })
    if (outcome.kind === 'RENEWAL_DISABLED') return NextResponse.json({ error: 'Auto-renew is disabled' }, { status: 409 })
    if (outcome.kind === 'ALREADY_EXISTS') return NextResponse.json({ period: outcome.period, created: false })
    return NextResponse.json({ period: outcome.period, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid renewal payload' }, { status: 400 })
    console.error('Error renewing contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
