import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'

const JWT_SECRET = process.env.JWT_SECRET

export interface CustomerTokenPayload {
    id: string
    phone: string
    role: 'CUSTOMER'
    websiteId?: string
    ownerAdminId?: string
    subdomain?: string
}

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

export function createCustomerToken(payload: Omit<CustomerTokenPayload, 'role'>): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment')
    }
    const tokenPayload: CustomerTokenPayload = {
        ...payload,
        role: 'CUSTOMER'
    }
    return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' }) // Long expiration for mobile app
}

export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
    try {
        if (!JWT_SECRET) return null
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
        const parsed = z
            .object({
                id: z.string().min(1),
                phone: z.string().min(1),
                role: z.literal('CUSTOMER')
            })
            .and(z.object({
                websiteId: z.string().min(1).optional(),
                ownerAdminId: z.string().min(1).optional(),
                subdomain: z.string().min(1).optional()
            }))
            .safeParse(decoded)
        if (!parsed.success) return null
        return parsed.data
    } catch {
        return null
    }
}

export async function getCustomerFromRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    const cookieToken = request.cookies.get('customerToken')?.value || null

    const token = bearerToken || cookieToken
    if (!token) return null

    const payload = verifyCustomerToken(token)

    if (!payload || payload.role !== 'CUSTOMER') {
        return null
    }

    // Optional: Verify customer still exists and is active in DB
    // This adds a DB call but increases security
    const customer = await db.customer.findUnique({
        where: { id: payload.id }
    })

    if (!customer || !customer.isActive) {
        return null
    }

    return customer
}
