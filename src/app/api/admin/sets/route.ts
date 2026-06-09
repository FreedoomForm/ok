import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { MENUS } from '@/lib/menuData'
import { getOwnerAdminId } from '@/lib/admin-scope'

// GET - Fetch all sets
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const requestedAdminId = searchParams.get('adminId')

        let ownerAdminId: string | null = null
        if (user.role === 'MIDDLE_ADMIN') {
            ownerAdminId = user.id
        } else if (user.role === 'LOW_ADMIN') {
            ownerAdminId = await getOwnerAdminId(user)
        } else if (user.role === 'SUPER_ADMIN') {
            ownerAdminId = requestedAdminId
        }

        const where: any = {}
        if (user.role !== 'SUPER_ADMIN') {
            if (!ownerAdminId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
            where.adminId = ownerAdminId
        } else if (ownerAdminId) {
            where.adminId = ownerAdminId
        }

        const sets = await db.menuSet.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(sets)
    } catch (error) {
        console.error('Error fetching sets:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Create a new set
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Initialize days with a single neutral group (no hardcoded calorie tiers).
        // Structure: { "1": [{ id, name, calories, dishes }], "2": [...] }
        const initialCalorieGroups: Record<string, any[]> = {}

        // Populate with Standard Menu data
        MENUS.forEach((menu: any) => {
            const groupDishes: any[] = menu.dishes.map((dish: any) => ({
                dishId: dish.id,
                dishName: dish.name,
                mealType: dish.mealType
            }))

            if (groupDishes.length > 0) {
                initialCalorieGroups[menu.menuNumber.toString()] = [
                    {
                        id: 'group-1',
                        name: '1',
                        calories: 0,
                        dishes: groupDishes
                    }
                ]
            }
        })

        const newSet = await db.menuSet.create({
            data: {
                name,
                description: description || '',
                menuNumber: 0, // 0 indicates a "Global" set containing all days
                calorieGroups: initialCalorieGroups,
                isActive: false, // Inactive by default
                adminId: user.id
            }
        })

        return NextResponse.json(newSet, { status: 201 })
    } catch (error) {
        console.error('Error creating set:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
