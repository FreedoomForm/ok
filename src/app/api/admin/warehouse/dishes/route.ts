import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy'
import { Prisma } from '@prisma/client'
import { parseBoundedPagination } from '@/lib/pagination'
import { createDishSchema, dishLifecycleSchema, updateDishSchema } from '@/lib/warehouse/dishes'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const url = new URL(request.url)
        const showDeleted = url.searchParams.get('showDeleted') === 'true'
        const search = url.searchParams.get('search')?.trim().slice(0, 120) ?? ''
        const lifecycleWhere = {
            ...(showDeleted ? { deletedAt: { not: null } } : { deletedAt: null }),
            ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
        }
        const pagination = parseBoundedPagination(
            url.searchParams.get('limit'),
            url.searchParams.get('offset'),
        )
        const query = pagination
            ? db.dish.findMany({
                where: lifecycleWhere,
                orderBy: { name: 'asc' },
                skip: pagination.offset,
                take: pagination.limit,
                include: { menus: { select: { number: true } } },
            })
            : db.dish.findMany({
                where: lifecycleWhere,
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
        if (!user || !canManageGlobalOperationalResource(user.role)) {
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
        if (!user || !canManageGlobalOperationalResource(user.role)) {
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

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const parsed = dishLifecycleSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid dish lifecycle payload' }, { status: 400 })
        const current = await db.dish.findUnique({ where: { id: parsed.data.id } })
        if (!current) return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
        const deletedAt = parsed.data.deletedAt === undefined ? current.deletedAt : parsed.data.deletedAt ? new Date() : null
        const isActive = parsed.data.deletedAt === undefined ? parsed.data.isActive ?? current.isActive : parsed.data.deletedAt ? false : parsed.data.isActive ?? true
        const dish = await db.dish.update({ where: { id: current.id }, data: { isActive, deletedAt } })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: parsed.data.deletedAt === true ? 'DELETE_DISH' : parsed.data.deletedAt === false ? 'RESTORE_DISH' : 'UPDATE_DISH_LIFECYCLE',
                    entityType: 'DISH',
                    entityId: dish.id,
                    oldValues: JSON.stringify({ isActive: current.isActive, deletedAt: current.deletedAt }),
                    newValues: JSON.stringify({ isActive: dish.isActive, deletedAt: dish.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log dish lifecycle:', logError)
        }
        return NextResponse.json(dish)
    } catch (error) {
        console.error('Error updating dish lifecycle:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id || id.length > 128) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        const current = await db.dish.findUnique({ where: { id } })
        if (!current) return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
        const dish = await db.dish.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: 'DELETE_DISH',
                    entityType: 'DISH',
                    entityId: dish.id,
                    oldValues: JSON.stringify({ isActive: current.isActive, deletedAt: current.deletedAt }),
                    newValues: JSON.stringify({ isActive: dish.isActive, deletedAt: dish.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log dish deletion:', logError)
        }
        return NextResponse.json({ success: true, dish })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
        }
        console.error('Error deleting dish:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
