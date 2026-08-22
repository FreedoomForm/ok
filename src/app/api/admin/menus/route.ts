
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-utils';
import { menuDishMutationSchema, menuNumberSchema } from '@/lib/admin/menus';

function isMissingRecord(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2016' || error.code === 'P2025')
}

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const numberStr = searchParams.get('number');

        if (numberStr) {
            const parsedNumber = menuNumberSchema.safeParse(numberStr)
            if (!parsedNumber.success) {
                return NextResponse.json({ error: 'Invalid menu number' }, { status: 400 });
            }
            const menu = await db.menu.findUnique({
                where: { number: parsedNumber.data },
                include: { dishes: true }
            });

            // If menu doesn't exist in DB (e.g. not seeded yet?), return empty structure? 
            // Or maybe 404? Let's return null.
            return NextResponse.json(menu);
        }

        // List all menus summary?
        const menus = await db.menu.findMany({
            select: { number: true, id: true, _count: { select: { dishes: true } } },
            orderBy: { number: 'asc' }
        });
        return NextResponse.json(menus);

    } catch (error) {
        console.error('Error fetching menus:', error);
        return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = menuDishMutationSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Missing required fields' }, { status: 400 });
        }
        const { menuNumber, dishId } = parsed.data;

        const menu = await db.menu.update({
            where: { number: menuNumber },
            data: {
                dishes: {
                    connect: { id: dishId }
                }
            },
            include: { dishes: true }
        });

        return NextResponse.json(menu);
    } catch (error) {
        if (isMissingRecord(error)) {
            return NextResponse.json({ error: 'Menu or dish not found' }, { status: 404 });
        }
        console.error('Error updating menu:', error);
        return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = menuDishMutationSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Missing required fields' }, { status: 400 });
        }
        const { menuNumber, dishId } = parsed.data;

        const menu = await db.menu.update({
            where: { number: menuNumber },
            data: {
                dishes: {
                    disconnect: { id: dishId }
                }
            },
            include: { dishes: true }
        });

        return NextResponse.json(menu);
    } catch (error) {
        if (isMissingRecord(error)) {
            return NextResponse.json({ error: 'Menu or dish not found' }, { status: 404 });
        }
        console.error('Error removing from menu:', error);
        return NextResponse.json({ error: 'Failed to remove from menu' }, { status: 500 });
    }
}
