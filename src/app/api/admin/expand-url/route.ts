import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'

export const GET = createApiRoute({
  handler: async ({ request }) => {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      throw new BadRequestError('URL is required')
    }

    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      return { data: { expandedUrl: response.url } }
    } catch (error) {
      throw new BadRequestError('Failed to expand URL')
    }
  },
})
