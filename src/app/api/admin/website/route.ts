import { createApiRoute } from '@/modules/shared/http'
import { type AdminRole } from '@/lib/roles'
import { findAdminWebsiteSettings, executeUpdateSite } from '@/modules/sites'
import type { SiteStyleVariant } from '@/lib/site-builder'

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'] as AdminRole[],
  handler: async ({ user }) => {
    const settings = await findAdminWebsiteSettings(user.id)
    return { data: settings }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'] as AdminRole[],
  handler: async ({ user, request }) => {
    const body = await request.json()
    const result = await executeUpdateSite({
      user,
      data: {
        subdomain: body.subdomain || '',
        siteName: body.siteName || 'My Site',
        styleVariant: (body.styleVariant || 'organic-warm') as SiteStyleVariant,
        chatEnabled: body.chatEnabled,
      },
    })
    return { data: result }
  },
})
