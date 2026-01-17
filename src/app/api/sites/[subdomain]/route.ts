import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: { subdomain: string } }
) {
    try {
        const website = await db.website.findUnique({
            where: { subdomain: params.subdomain },
            select: {
                id: true,
                subdomain: true,
                chatEnabled: true,
                theme: true
            }
        })

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 })
        }

        return NextResponse.json(website)

    } catch (error) {
        console.error('Error fetching website:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
