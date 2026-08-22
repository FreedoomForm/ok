import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { RESERVED_SUBDOMAINS, normalizeSubdomain } from '@/lib/site-builder'
import { extractSubdomainFromHost } from '@/lib/subdomain-host'
import { applySecurityHeaders } from '@/lib/security-headers'

const { auth } = NextAuth(authConfig)

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN
const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/super-admin',
  MIDDLE_ADMIN: '/middle-admin',
  LOW_ADMIN: '/low-admin',
  COURIER: '/courier',
}

function requiredRoleForPath(pathname: string): string | null {
  if (pathname.startsWith('/super-admin')) return 'SUPER_ADMIN'
  if (pathname.startsWith('/middle-admin')) return 'MIDDLE_ADMIN'
  if (pathname.startsWith('/low-admin')) return 'LOW_ADMIN'
  if (pathname.startsWith('/courier')) return 'COURIER'
  return null
}

function shouldSkipPath(pathname: string) {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sites/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/middle-admin') ||
    pathname.startsWith('/low-admin') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/courier')
  )
}

function withSecurityHeaders(response: NextResponse, pathname: string) {
  applySecurityHeaders(response.headers, process.env.NODE_ENV === 'production', process.env.CSP_REPORT_URI)
  if (pathname.startsWith('/api/customers')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  }
  return response
}

const handlePageRequest = auth((request) => {
  const { nextUrl } = request
  const requiredRole = requiredRoleForPath(nextUrl.pathname)
  const authUser = (request as NextRequest & { auth?: { user?: { role?: string } } }).auth?.user

  if (requiredRole) {
    if (!authUser) {
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), nextUrl.pathname)
    }

    if (authUser.role !== requiredRole) {
      const fallbackPath = ROLE_HOME[authUser.role || ''] || '/login'
      return withSecurityHeaders(NextResponse.redirect(new URL(fallbackPath, request.url)), nextUrl.pathname)
    }
  }

  if (shouldSkipPath(nextUrl.pathname)) {
    return withSecurityHeaders(NextResponse.next(), nextUrl.pathname)
  }

  const rawSubdomain = extractSubdomainFromHost(request.headers.get('host'), ROOT_DOMAIN)
  if (!rawSubdomain) {
    return withSecurityHeaders(NextResponse.next(), nextUrl.pathname)
  }

  const normalizedSubdomain = normalizeSubdomain(rawSubdomain)
  if (!normalizedSubdomain || RESERVED_SUBDOMAINS.has(normalizedSubdomain)) {
    return withSecurityHeaders(NextResponse.next(), nextUrl.pathname)
  }

  const rewrittenUrl = nextUrl.clone()
  rewrittenUrl.pathname = `/sites/${normalizedSubdomain}${nextUrl.pathname === '/' ? '' : nextUrl.pathname}`

  return withSecurityHeaders(NextResponse.rewrite(rewrittenUrl), nextUrl.pathname)
}) as unknown as NextMiddleware

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return withSecurityHeaders(NextResponse.next(), request.nextUrl.pathname)
  }
  return handlePageRequest(request, event)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
