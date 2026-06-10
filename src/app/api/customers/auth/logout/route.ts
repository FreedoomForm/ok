import { createPublicApiRoute, type CookieOption } from '@/modules/shared/http'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'

export const POST = createPublicApiRoute(async () => {
  const cookieOptions: CookieOption = {
    name: 'customerToken',
    value: '',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    },
  }

  return {
    data: { success: true },
    cookies: [cookieOptions],
  }
})
