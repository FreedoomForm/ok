import { NextRequest, NextResponse } from 'next/server'
import { executeSiteVerifyCode } from '@/modules/sites'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'
import { AppError } from '@/modules/shared/errors'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await context.params
    const body = await request.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    const result = await executeSiteVerifyCode({ subdomain, phone, code })

    const response = NextResponse.json({ data: result })

    // Persist auth across subdomains (production). On localhost the cookie becomes host-only.
    response.cookies.set({
      name: 'customerToken',
      value: result.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    })

    return response
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('[api/sites/verify-code] Unhandled error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
