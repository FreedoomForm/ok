import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createCustomerToken } from '@/lib/customer-auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { phone, password } = body

        if (!phone || !password) {
            return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
        }

        const customer = await db.customer.findUnique({
            where: { phone }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        if (!customer.isActive) {
            return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
        }

        if (!customer.password) {
            return NextResponse.json({ error: 'Password not set. Please contact support or set password.' }, { status: 400 })
        }

        const isValid = await verifyPassword(password, customer.password)

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const token = createCustomerToken({
            id: customer.id,
            phone: customer.phone
        })

        return NextResponse.json({
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                address: customer.address
            }
        })

    } catch (error) {
        console.error('Customer login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
