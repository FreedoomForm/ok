import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
}

export interface CustomerTokenPayload {
    id: string
    phone: string
    role: 'CUSTOMER'
}

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

export function createCustomerToken(payload: Omit<CustomerTokenPayload, 'role'>): string {
    const tokenPayload: CustomerTokenPayload = {
        ...payload,
        role: 'CUSTOMER'
    }
    return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' }) // Long expiration for mobile app
}

export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as CustomerTokenPayload
    } catch (error) {
        return null
    }
}

export async function getCustomerFromRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.split(' ')[1]
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
