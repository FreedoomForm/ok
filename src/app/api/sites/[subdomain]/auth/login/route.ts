import { createPublicApiRoute, type CookieOption } from '@/modules/shared/http'
import { BadRequestError, RateLimitError } from '@/modules/shared/errors'
import { executeSiteLogin } from '@/modules/sites'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const LOGIN_RATE_LIMIT = 15
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export const POST = createPublicApiRoute(async ({ request, params }) => {
  const { subdomain } = params ?? {}
  const body = await request.json().catch(() => ({}))
  const phone = typeof body.phone === 'string' ? body.phone : ''
  const ip = getClientIp(request.headers)

  const limit = checkRateLimit(`site-login:${subdomain}:${ip}:${phone}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)
  if (!limit.allowed) {
    throw new RateLimitError(limit.retryAfterSec, 'Too many login attempts. Please try again later.')
  }

  const result = await executeSiteLogin({ subdomain: subdomain ?? '', phone })

  const cookieOptions: CookieOption = {
    name: 'customerToken',
    value: result.token,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    },
  }

  return {
    data: result,
    cookies: [cookieOptions],
  }
})
