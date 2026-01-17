import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET - Fetch all sets for the admin
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For now, sets are stored in a simple JSON structure
        // In a real application, you'd have a proper MenuSet model in Prisma
        // For now, we'll simulate this with a simple in-memory or localStorage approach

        // Since we don't have a MenuSet model yet, return empty array
        // The actual implementation would fetch from database
        return NextResponse.json([]);
    } catch (error) {
        console.error('Error fetching sets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new set
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, menuNumber, calorieGroups } = body;

        if (!name || !menuNumber || !calorieGroups) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create a new set object
        // In a real implementation, this would be saved to the database
        const newSet = {
            id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description: description || '',
            menuNumber,
            calorieGroups,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            adminId: session.user.id
        };

        // For now, return the created set
        // In production, save to database first
        return NextResponse.json(newSet, { status: 201 });
    } catch (error) {
        console.error('Error creating set:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
