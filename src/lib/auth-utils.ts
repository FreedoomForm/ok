import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { type AdminRole, isAdminRole, ADMIN_ROLE_LEVEL } from '@/lib/roles'

const JWT_SECRET = process.env.JWT_SECRET

export interface AuthUser {
    id: string
    email: string
    role: AdminRole
}

const adminJwtPayloadSchema = z.object({
    id: z.string().min(1),
    email: z.string().min(1),
    role: z.string().min(1),
})

function mapSessionUserToAuthUser(sessionUser: unknown): AuthUser | null {
    if (!sessionUser || typeof sessionUser !== 'object') return null

    const rawId = (sessionUser as any).id
    const rawEmail = (sessionUser as any).email
    const rawRole = (sessionUser as any).role

    if (typeof rawId !== 'string' || rawId.length === 0) return null
    if (typeof rawEmail !== 'string' || rawEmail.length === 0) return null
    if (!isAdminRole(rawRole)) return null

    return {
        id: rawId,
        email: rawEmail,
        role: rawRole
    }
}

/**
 * Unified authentication helper that supports both NextAuth sessions and JWT tokens.
 * On Vercel serverless, auth() may fail to resolve the request context, so we try
 * multiple approaches and log any failures for debugging.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
    // Strategy 1: auth() without arguments (relies on async local storage / request context)
    try {
        const session = await auth()
        const mappedUser = mapSessionUserToAuthUser(session?.user)
        if (mappedUser) return mappedUser
        if (process.env.NODE_ENV !== 'production') {
            console.log('[auth-utils] auth() returned session but user mapping failed:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                userKeys: session?.user ? Object.keys(session.user) : [],
            })
        }
    } catch (err) {
        console.error('[auth-utils] auth() threw error:', err instanceof Error ? err.message : err)
    }

    // Strategy 2: auth(request) — explicitly pass the request for cookie-based resolution
    try {
        const session = await auth(request as any)
        const mappedUser = mapSessionUserToAuthUser(session?.user)
        if (mappedUser) return mappedUser
        if (process.env.NODE_ENV !== 'production') {
            console.log('[auth-utils] auth(request) returned session but user mapping failed:', {
                hasSession: !!session,
                hasUser: !!session?.user,
            })
        }
    } catch (err) {
        console.error('[auth-utils] auth(request) threw error:', err instanceof Error ? err.message : err)
    }

    // Strategy 3: JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
            if (!JWT_SECRET) return null
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
            const parsed = adminJwtPayloadSchema.safeParse(decoded)
            if (!parsed.success) return null
            if (!isAdminRole(parsed.data.role)) return null
            return {
                id: parsed.data.id,
                email: parsed.data.email,
                role: parsed.data.role
            }
        } catch {
            return null
        }
    }

    // All strategies failed — log for debugging
    const hasSessionCookie = request.cookies.get('authjs.session-token')?.value ||
        request.cookies.get('__Secure-authjs.session-token')?.value
    console.warn('[auth-utils] All auth strategies failed.', {
        hasAuthHeader: !!authHeader,
        hasSessionCookie: !!hasSessionCookie,
        AUTH_SECRET_set: !!process.env.AUTH_SECRET,
        JWT_SECRET_set: !!JWT_SECRET,
        url: request.url,
    })

    return null
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, allowedRoles: readonly AdminRole[]): boolean
export function hasRole(user: AuthUser, allowedRoles: readonly string[]): boolean
export function hasRole(user: AuthUser, allowedRoles: readonly string[]): boolean {
    return allowedRoles.includes(user.role)
}

/**
 * Check if user can modify target admin (role hierarchy)
 */
export function canModifyAdmin(user: AuthUser, targetRole: AdminRole | string): boolean {
    const target = isAdminRole(targetRole) ? targetRole : null
    const userLevel = ADMIN_ROLE_LEVEL[user.role] ?? 0
    const targetLevel = target ? (ADMIN_ROLE_LEVEL[target] ?? 0) : 0
    return userLevel > targetLevel
}
