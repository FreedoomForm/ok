import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

// Types for Dish
interface DishInput {
    id?: string
    name: string
    description?: string
    mealType: string
    ingredients: { name: string; amount: number; unit: string }[]
    imageUrl?: string
    calorieMappings?: any // { "7": ["1200", "2000"], "8": ["1600"] }
    menuNumbers?: number[] // Array of menu numbers (1-21) this dish belongs to
}

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const dishes = await db.dish.findMany({
            orderBy: { name: 'asc' },
            include: {
                menus: {
                    select: { number: true }
                }
            }
        })

        // Flatten menus for easier frontend consumption if desired, or let frontend handle it
        const formattedDishes = dishes.map(d => ({
            ...d,
            menuNumbers: d.menus.map(m => m.number)
        }))

        return NextResponse.json(formattedDishes)
    } catch (error) {
        console.error('Error fetching dishes:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body: DishInput = await request.json()
        const { name, description, mealType, ingredients, imageUrl, calorieMappings, menuNumbers } = body

        if (!name || !mealType) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 })
        }

        const dish = await db.dish.create({
            data: {
                name,
                description,
                mealType,
                ingredients: ingredients || [], // Store as JSON
                imageUrl,
                calorieMappings,
                menus: {
                    connect: menuNumbers?.map(num => ({ number: num })) || []
                }
            },
            include: {
                menus: { select: { number: true } }
            }
        })

        return NextResponse.json({ ...dish, menuNumbers: (dish as any).menus.map((m: any) => m.number) })
    } catch (error) {
        console.error('Error creating dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body: DishInput = await request.json()
        const { id, name, description, mealType, ingredients, imageUrl, calorieMappings, menuNumbers } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        const dish = await db.dish.update({
            where: { id },
            data: {
                name,
                description,
                mealType,
                ingredients: ingredients || [],
                imageUrl,
                calorieMappings,
                menus: {
                    set: [], // Disconnect all first (simpler than managing connect/disconnect diffs)
                    connect: menuNumbers?.map(num => ({ number: num })) || []
                }
            },
            include: {
                menus: { select: { number: true } }
            }
        })

        return NextResponse.json({ ...dish, menuNumbers: (dish as any).menus.map((m: any) => m.number) })
    } catch (error) {
        console.error('Error updating dish:', error)
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

        await db.dish.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
