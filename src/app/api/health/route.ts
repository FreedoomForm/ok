import { createPublicApiRoute } from '@/modules/shared/http'

export const GET = createPublicApiRoute(async () => {
  return { data: { message: 'Good!' } }
})
