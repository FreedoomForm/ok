import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy'
import { createIngredientSchema, ingredientLifecycleSchema, updateIngredientSchema } from '@/lib/warehouse/ingredients'
import { parseBoundedPagination } from '@/lib/pagination'

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
            ? db.warehouseItem.findMany({
                where: lifecycleWhere,
                orderBy: { name: 'asc' },
                skip: pagination.offset,
                take: pagination.limit,
            })
            : db.warehouseItem.findMany({
                where: lifecycleWhere,
                orderBy: { name: 'asc' },
            })
        const items = await query

        return NextResponse.json(items)
    } catch (error) {
        console.error('Error fetching inventory:', error)
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
        const parsed = createIngredientSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid ingredient payload' }, { status: 400 })
        }
        const { name, amount, unit, kcalPerGram, pricePerUnit, priceUnit } = parsed.data

                    const item = await db.warehouseItem.create({

            data: {
                name,
                amount,
                unit,
                kcalPerGram: kcalPerGram ?? null,
                pricePerUnit: pricePerUnit ?? null,
                priceUnit,
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
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = updateIngredientSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid ingredient payload' }, { status: 400 })
        }
        const { id, name, amount, unit, kcalPerGram, pricePerUnit, priceUnit } = parsed.data

        const item = await db.warehouseItem.update({
            where: { id },
            data: {
                name,
                amount,
                unit,
                kcalPerGram: kcalPerGram ?? null,
                pricePerUnit: pricePerUnit ?? null,
                priceUnit,
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error updating ingredient:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const parsed = ingredientLifecycleSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success || (parsed.data.isActive === undefined && parsed.data.deletedAt === undefined)) {
            return NextResponse.json({ error: 'Invalid ingredient lifecycle payload' }, { status: 400 })
        }
        const current = await db.warehouseItem.findUnique({ where: { id: parsed.data.id } })
        if (!current) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
        const deletedAt = parsed.data.deletedAt === undefined ? current.deletedAt : parsed.data.deletedAt ? new Date() : null
        const isActive = parsed.data.deletedAt === undefined ? parsed.data.isActive ?? current.isActive : parsed.data.deletedAt ? false : parsed.data.isActive ?? true
        const item = await db.warehouseItem.update({ where: { id: current.id }, data: { isActive, deletedAt } })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: parsed.data.deletedAt === true ? 'DELETE_INGREDIENT' : parsed.data.deletedAt === false ? 'RESTORE_INGREDIENT' : 'UPDATE_INGREDIENT_LIFECYCLE',
                    entityType: 'INGREDIENT',
                    entityId: item.id,
                    oldValues: JSON.stringify({ isActive: current.isActive, deletedAt: current.deletedAt }),
                    newValues: JSON.stringify({ isActive: item.isActive, deletedAt: item.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log ingredient lifecycle:', logError)
        }
        return NextResponse.json(item)
    } catch (error) {
        console.error('Error updating ingredient lifecycle:', error)
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

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        const current = await db.warehouseItem.findUnique({ where: { id } })
        if (!current) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
        const item = await db.warehouseItem.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: 'DELETE_INGREDIENT',
                    entityType: 'INGREDIENT',
                    entityId: item.id,
                    oldValues: JSON.stringify({ isActive: current.isActive, deletedAt: current.deletedAt }),
                    newValues: JSON.stringify({ isActive: item.isActive, deletedAt: item.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log ingredient deletion:', logError)
        }
        return NextResponse.json({ success: true, item })
    } catch (error) {
        console.error('Error deleting ingredient:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
