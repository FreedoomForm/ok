import { createPublicApiRoute } from '@/modules/shared/http'
import { executeSiteSendCode } from '@/modules/sites'

export const POST = createPublicApiRoute(async ({ request, params }) => {
  const subdomain = params?.subdomain
  if (!subdomain) {
    throw new Error('Subdomain is required')
  }

  const body = await request.json().catch(() => ({}))
  const phone = typeof body.phone === 'string' ? body.phone : ''

  const result = await executeSiteSendCode({ subdomain, phone })
  return { data: result }
})
