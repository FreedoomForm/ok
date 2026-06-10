import { createPublicApiRoute, type CookieOption } from '@/modules/shared/http'
import { executeSiteVerifyCode } from '@/modules/sites'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'

export const POST = createPublicApiRoute(async ({ request, params }) => {
  const { subdomain } = params ?? {}
  const body = await request.json().catch(() => ({}))
  const phone = typeof body.phone === 'string' ? body.phone : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  const result = await executeSiteVerifyCode({ subdomain: subdomain ?? '', phone, code })

  const cookieOptions: CookieOption = {
    name: 'customerToken',
    value: result.token,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    },
  }

  return {
    data: result,
    cookies: [cookieOptions],
  }
})
