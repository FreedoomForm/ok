import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'

export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
            console.error('[SECURITY] CRON_SECRET not configured!')
            return NextResponse.json(
                { error: 'Service misconfigured' },
                { status: 500 }
            )
        }

        if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
            console.warn('[SECURITY] Unauthorized cron access attempt')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const now = new Date()
        const result = await db.$transaction(async (tx) => {
            const expiredTrials = await tx.admin.findMany({
                where: {
                    trialEndsAt: { lte: now },
                    isActive: true,
                    role: { in: ['MIDDLE_ADMIN', 'LOW_ADMIN'] },
                },
            })

            const disabledCount = await tx.admin.updateMany({
                where: {
                    id: { in: expiredTrials.map((admin) => admin.id) },
                    isActive: true,
                },
                data: { isActive: false },
            })

            for (const admin of expiredTrials) {
                await tx.actionLog.create({
                    data: {
                        adminId: admin.id,
                        action: 'TRIAL_EXPIRED',
                        entityType: 'ADMIN',
                        entityId: admin.id,
                        details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'TRIAL_EXPIRED', entity: 'LIFECYCLE' } }),
                        description: `Trial period expired for ${admin.email}`,
                        oldValues: JSON.stringify({ isActive: true }),
                        newValues: JSON.stringify({ isActive: false }),
                    },
                })
            }

            return { expiredTrials, disabledCount }
        })

        return NextResponse.json(
            {
                success: true,
                message: `Disabled ${result.disabledCount.count} expired trial accounts`,
                disabledAccounts: result.expiredTrials.map((admin) => ({
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    trialEndsAt: admin.trialEndsAt,
                })),
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Check trials cron error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
