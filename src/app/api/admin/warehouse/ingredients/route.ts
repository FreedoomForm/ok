import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

interface IngredientInput {
    id?: string
    name: string
    amount: number
    unit: string
}

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const items = await db.warehouseItem.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(items)
    } catch (error) {
        console.error('Error fetching inventory:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body: IngredientInput = await request.json()
        const { name, amount, unit } = body

        if (!name) {
            return NextResponse.json({ error: 'Missing Name' }, { status: 400 })
        }

        const item = await db.warehouseItem.create({
            data: {
                name,
                amount: amount || 0,
                unit: unit || 'gr'
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error creating ingredient:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body: IngredientInput = await request.json()
        const { id, name, amount, unit } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        const item = await db.warehouseItem.update({
            where: { id },
            data: {
                name,
                amount,
                unit
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error updating ingredient:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        await db.warehouseItem.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ingredient:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
