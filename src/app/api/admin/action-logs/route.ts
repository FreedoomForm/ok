import { createApiRoute } from '@/modules/shared/http'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { listActionLogs } from '@/modules/admins'

export const GET = createApiRoute({
  handler: async ({ user, request }) => {
    const { searchParams } = new URL(request.url)
    const targetAdminId = searchParams.get('adminId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateStr = searchParams.get('date')
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : (await getGroupAdminIds(user)) ?? [user.id]

    const result = await listActionLogs({
      adminId: targetAdminId || undefined,
      groupAdminIds: user.role === 'SUPER_ADMIN' ? null : groupAdminIds,
      date: dateStr || undefined,
      from: fromStr || undefined,
      to: toStr || undefined,
      limit,
      offset,
    })

    return { data: result }
  },
})
