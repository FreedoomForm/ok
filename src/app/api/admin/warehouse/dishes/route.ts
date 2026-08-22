import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'
import { parseBoundedPagination } from '@/lib/pagination'
import { createDishSchema, updateDishSchema } from '@/lib/warehouse/dishes'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const pagination = parseBoundedPagination(
            new URL(request.url).searchParams.get('limit'),
            new URL(request.url).searchParams.get('offset'),
        )
        const query = pagination
            ? db.dish.findMany({
                orderBy: { name: 'asc' },
                skip: pagination.offset,
                take: pagination.limit,
                include: { menus: { select: { number: true } } },
            })
            : db.dish.findMany({
                orderBy: { name: 'asc' },
                include: { menus: { select: { number: true } } },
            })
        const dishes = await query

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
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = createDishSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid dish payload' }, { status: 400 })
        }
        const { name, description, mealType, ingredients, calorieMappings, menuNumbers } = parsed.data

        const dish = await db.dish.create({
            data: {
                name,
                description,
                mealType,
                ingredients,
                calorieMappings: calorieMappings ?? undefined,
                menus: {
                    connect: menuNumbers?.map(num => ({ number: num })) || []
                }
            },
            include: {
                menus: { select: { number: true } }
            }
        })

        return NextResponse.json({ ...dish, menuNumbers: dish.menus.map((menu) => menu.number) })
    } catch (error) {
        console.error('Error creating dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = updateDishSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid dish payload' }, { status: 400 })
        }
        const { id, name, description, mealType, ingredients, calorieMappings, menuNumbers } = parsed.data

        const dish = await db.dish.update({
            where: { id },
            data: {
                name,
                description,
                mealType,
                ingredients,
                calorieMappings: calorieMappings ?? undefined,
                menus: {
                    set: [], // Disconnect all first (simpler than managing connect/disconnect diffs)
                    connect: menuNumbers?.map(num => ({ number: num })) || []
                }
            },
            include: {
                menus: { select: { number: true } }
            }
        })

        return NextResponse.json({ ...dish, menuNumbers: dish.menus.map((menu) => menu.number) })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
        }
        console.error('Error updating dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id || id.length > 128) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        await db.dish.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
        }
        console.error('Error deleting dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
