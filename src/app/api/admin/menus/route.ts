
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const numberStr = searchParams.get('number');

        if (numberStr) {
            const menu = await db.menu.findUnique({
                where: { number: parseInt(numberStr) },
                include: { dishes: true }
            });

            return NextResponse.json(menu);
        }

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
        if (!user || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { menuNumber, dishId } = body;

        if (!menuNumber || !dishId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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
        console.error('Error updating menu:', error);
        return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { menuNumber, dishId } = body;

        if (!menuNumber || !dishId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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
        console.error('Error removing from menu:', error);
        return NextResponse.json({ error: 'Failed to remove from menu' }, { status: 500 });
    }
}
