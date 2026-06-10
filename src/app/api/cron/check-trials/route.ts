import { createPublicApiRoute } from '@/modules/shared/http'
import { UnauthorizedError, InternalError } from '@/modules/shared/errors'
import { db } from '@/lib/db'

export const GET = createPublicApiRoute(async ({ request }) => {
  const CRON_SECRET = process.env.CRON_SECRET

  // Validate CRON_SECRET is configured
  if (!CRON_SECRET) {
    throw new InternalError('CRON_SECRET not configured')
  }

  const authHeader = request.headers.get('authorization')

  // Verify CRON_SECRET for security
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    throw new UnauthorizedError('Unauthorized')
  }

  const now = new Date()

  // Find all admins with expired trials that are still active
  const expiredTrials = await db.admin.findMany({
    where: {
      trialEndsAt: {
        lte: now,
      },
      isActive: true,
      role: {
        in: ['MIDDLE_ADMIN', 'LOW_ADMIN'],
      },
    },
  })

  // Disable expired trial accounts
  const disabledCount = await db.admin.updateMany({
    where: {
      id: {
        in: expiredTrials.map((admin) => admin.id),
      },
    },
    data: {
      isActive: false,
    },
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
        newValues: JSON.stringify({ isActive: false }),
      },
    })
  }

  return {
    data: {
      success: true,
      message: `Disabled ${disabledCount.count} expired trial accounts`,
      disabledAccounts: expiredTrials.map((admin) => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        trialEndsAt: admin.trialEndsAt,
      })),
    },
  }
})
