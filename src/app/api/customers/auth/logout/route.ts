import { NextRequest, NextResponse } from 'next/server'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true })

  // Expire cookie (domain must match the login cookie domain).
  response.cookies.set({
    name: 'customerToken',
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
  })

  return response
}


