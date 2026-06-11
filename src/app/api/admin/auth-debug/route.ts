import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * Debug endpoint — returns auth state info (no secrets).
 * Remove or restrict before production go-live.
 */
export async function GET(request: NextRequest) {
  const diag: Record<string, unknown> = {
    url: request.url,
    method: request.method,
  }

  // Check cookies
  const sessionCookie = request.cookies.get('authjs.session-token')?.value
  const secureSessionCookie = request.cookies.get('__Secure-authjs.session-token')?.value
  diag.cookies = {
    hasSessionCookie: !!sessionCookie,
    hasSecureSessionCookie: !!secureSessionCookie,
  }

  // Check env
  diag.env = {
    AUTH_SECRET_set: !!process.env.AUTH_SECRET,
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    DATABASE_URL_set: !!process.env.DATABASE_URL,
  }

  // Try auth() directly
  try {
    const session1 = await auth()
    diag.authNoArgs = {
      success: true,
      hasSession: !!session1,
      hasUser: !!session1?.user,
      userId: (session1?.user as any)?.id ?? null,
      userRole: (session1?.user as any)?.role ?? null,
    }
  } catch (err) {
    diag.authNoArgs = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Try auth(request)
  try {
    const session2 = await auth(request as any)
    diag.authWithRequest = {
      success: true,
      hasSession: !!session2,
      hasUser: !!session2?.user,
      userId: (session2?.user as any)?.id ?? null,
      userRole: (session2?.user as any)?.role ?? null,
    }
  } catch (err) {
    diag.authWithRequest = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Try getAuthUser
  try {
    const user = await getAuthUser(request)
    diag.getAuthUser = {
      success: !!user,
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
    }
  } catch (err) {
    diag.getAuthUser = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json(diag, { status: 200 })
}
