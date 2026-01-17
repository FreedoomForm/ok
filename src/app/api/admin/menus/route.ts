
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const numberStr = searchParams.get('number');

        if (numberStr) {
            const menu = await db.menu.findUnique({
                where: { number: parseInt(numberStr) },
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

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
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

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
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
