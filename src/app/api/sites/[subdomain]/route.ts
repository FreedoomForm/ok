import { createPublicApiRoute } from '@/modules/shared/http'
import { executeGetSite } from '@/modules/sites'

export const GET = createPublicApiRoute(async ({ params }) => {
  const subdomain = params?.subdomain
  if (!subdomain) {
    throw new Error('Subdomain is required')
  }

  const site = await executeGetSite({ subdomain })
  return { data: site }
})
