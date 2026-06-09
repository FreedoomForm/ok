import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const CRON_SECRET = process.env.CRON_SECRET

        // Validate CRON_SECRET is configured
        if (!CRON_SECRET) {
            console.error('[SECURITY] CRON_SECRET not configured!')
            return NextResponse.json(
                { error: 'Service misconfigured' },
                { status: 500 }
            )
        }

        const authHeader = request.headers.get('authorization')

        // Verify CRON_SECRET for security
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            console.warn('[SECURITY] Unauthorized cron access attempt')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const now = new Date()

        // Find all admins with expired trials that are still active
        const expiredTrials = await db.admin.findMany({
            where: {
                trialEndsAt: {
                    lte: now
                },
                isActive: true,
                role: {
                    in: ['MIDDLE_ADMIN', 'LOW_ADMIN'] // Only disable trial accounts, not super admins or couriers
                }
            }
        })

        // Disable expired trial accounts
        const disabledCount = await db.admin.updateMany({
            where: {
                id: {
                    in: expiredTrials.map(admin => admin.id)
                }
            },
            data: {
                isActive: false
            }
        })

        // Log the action for each disabled admin
        for (const admin of expiredTrials) {
            await db.actionLog.create({
                data: {
                    adminId: admin.id,
                    action: 'TRIAL_EXPIRED',
                    entityType: 'ADMIN',
                    entityId: admin.id,
                    description: `Trial period expired for ${admin.email}`,
                    oldValues: JSON.stringify({ isActive: true }),
                    newValues: JSON.stringify({ isActive: false })
                }
            })
        }

        return NextResponse.json(
            {
                success: true,
                message: `Disabled ${disabledCount.count} expired trial accounts`,
                disabledAccounts: expiredTrials.map(admin => ({
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    trialEndsAt: admin.trialEndsAt
                }))
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
