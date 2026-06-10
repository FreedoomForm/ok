import { NextRequest, NextResponse } from 'next/server'
import { executeSiteLogin } from '@/modules/sites'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'
import { AppError } from '@/modules/shared/errors'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const LOGIN_RATE_LIMIT = 15
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await context.params
    const body = await request.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const ip = getClientIp(request.headers)

    const limit = checkRateLimit(`site-login:${subdomain}:${ip}:${phone}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.', retryAfterSec: limit.retryAfterSec } },
        { status: 429 },
      )
    }

    const result = await executeSiteLogin({ subdomain, phone })

    const response = NextResponse.json({ data: result })

    response.cookies.set({
      name: 'customerToken',
      value: result.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    })

    return response
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('[api/sites/login] Unhandled error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
