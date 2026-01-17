import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment')
}

export interface AuthUser {
    id: string
    email: string
    role: string
}

/**
 * Unified authentication helper that supports both NextAuth sessions and JWT tokens
 * Checks NextAuth session first, falls back to JWT token from Authorization header
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
    // Try NextAuth session first
    try {
        const session = await auth()
        if (session?.user) {
            return {
                id: session.user.id,
                email: session.user.email!,
                role: session.user.role
            }
        }
    } catch (error) {
        // NextAuth not available in this context, continue to JWT
    }

    // Fall back to JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.substring(7)
    try {
        const decoded = jwt.verify(token, JWT_SECRET!) as any
        return {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        }
    } catch {
        return null
    }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
    return allowedRoles.includes(user.role)
}

/**
 * Check if user can modify target admin (role hierarchy)
 */
export function canModifyAdmin(user: AuthUser, targetRole: string): boolean {
    const roleHierarchy = {
        'SUPER_ADMIN': 4,
        'MIDDLE_ADMIN': 3,
        'LOW_ADMIN': 2,
        'COURIER': 1
    }

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0

    return userLevel > targetLevel
}
