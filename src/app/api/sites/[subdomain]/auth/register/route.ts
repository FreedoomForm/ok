import { createPublicApiRoute } from '@/modules/shared/http'
import { executeSiteRegister } from '@/modules/sites'

export const POST = createPublicApiRoute(async ({ request, params }) => {
  const subdomain = params?.subdomain
  if (!subdomain) {
    throw new Error('Subdomain is required')
  }

  const body = await request.json().catch(() => ({}))
  const phone = typeof body.phone === 'string' ? body.phone : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined

  const result = await executeSiteRegister({ subdomain, data: { phone, name } })
  return { data: result }
})
