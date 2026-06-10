import { createApiRoute } from '@/modules/shared/http'
import { type AdminRole } from '@/lib/roles'
import { aiEditWebsite } from '@/modules/sites'
import type { AiEditData } from '@/modules/sites'

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'] as AdminRole[],
  handler: async ({ user, request }) => {
    const body = await request.json().catch(() => ({}))

    const data: AiEditData = {
      prompt: typeof body?.prompt === 'string' ? body.prompt.trim() : '',
      apply: typeof body?.apply === 'boolean' ? body.apply : undefined,
      dryRun: body?.dryRun === true || body?.previewOnly === true,
      mode: body?.mode,
      sections: body?.sections,
      siteName: typeof body?.siteName === 'string' ? body.siteName.trim().slice(0, 80) : '',
      subdomain: typeof body?.subdomain === 'string' ? body.subdomain : '',
      autoResolveSubdomain: body?.autoResolveSubdomain !== false,
      styleVariant: typeof body?.styleVariant === 'string' ? body.styleVariant : '',
      includeContentPreview: body?.includeContentPreview !== false,
      targetAdminId: typeof body?.targetAdminId === 'string' ? body.targetAdminId : '',
    }

    // For super admins editing another admin's site
    const targetAdminId = user.role === 'SUPER_ADMIN' && data.targetAdminId ? data.targetAdminId : user.id

    const result = await aiEditWebsite(targetAdminId, data)
    return { data: result }
  },
})
