import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'

export async function GET(request: NextRequest) {
    try {
        const customer = await getCustomerFromRequest(request)
        if (!customer) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        return NextResponse.json(customer)

    } catch (error) {
        console.error('Error fetching customer profile:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const customer = await getCustomerFromRequest(request)
        if (!customer) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, address, preferences, calories, deliveryDays } = body

        const updatedCustomer = await db.customer.update({
            where: { id: customer.id },
            data: {
                name,
                address,
                preferences,
                calories: calories ? parseInt(calories) : undefined,
                deliveryDays: deliveryDays ? JSON.stringify(deliveryDays) : undefined
            }
        })

        return NextResponse.json(updatedCustomer)

    } catch (error) {
        console.error('Error updating customer profile:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
