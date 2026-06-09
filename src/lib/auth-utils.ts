import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
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
 * Unified authentication helper that supports NextAuth sessions and JWT tokens.
 *
 * Strategy priority:
 * 1. getToken() from next-auth/jwt — reads the session cookie directly from the
 *    Request object. Most reliable on Vercel serverless where auth() may fail
 *    to resolve async local storage.
 * 2. auth() — uses NextAuth's internal async local storage (may fail on Vercel).
 * 3. JWT Bearer token from Authorization header — for API-only access.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
    // Strategy 1: getToken() — reads cookie directly from the Request, no async local storage needed
    // Must detect secureCookie so getToken looks for __Secure-authjs.session-token on HTTPS
    try {
        const secureCookie = request.url.startsWith('https://') || !!request.cookies.get('__Secure-authjs.session-token')?.value
        const token = await getToken({
            req: request as any,
            secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
            secureCookie,
        })
        if (token) {
            const rawId = token.id as string | undefined
            const rawEmail = token.email as string | undefined
            const rawRole = token.role as string | undefined

            if (rawId && rawEmail && isAdminRole(rawRole)) {
                return {
                    id: rawId,
                    email: rawEmail,
                    role: rawRole
                }
            }
        }
    } catch (err) {
        console.error('[auth-utils] getToken() threw error:', err instanceof Error ? err.message : err)
    }

    // Strategy 2: auth() — relies on async local storage (may fail on Vercel serverless)
    try {
        const session = await auth()
        const mappedUser = mapSessionUserToAuthUser(session?.user)
        if (mappedUser) return mappedUser
    } catch (err) {
        console.error('[auth-utils] auth() threw error:', err instanceof Error ? err.message : err)
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
