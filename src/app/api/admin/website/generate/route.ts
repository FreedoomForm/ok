import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { generateWebsiteContent } from '@/lib/ai-site-generator'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        const { prompt, subdomain } = body

        if (!prompt || !subdomain) {
            return NextResponse.json({ error: 'Prompt and subdomain are required' }, { status: 400 })
        }

        // Check if subdomain is taken
        const existingSite = await db.website.findUnique({
            where: { subdomain }
        })

        if (existingSite && existingSite.adminId !== user.id) {
            return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 })
        }

        // Generate content
        const content = await generateWebsiteContent(prompt)

        // Save to DB
        const website = await db.website.upsert({
            where: { adminId: user.id },
            update: {
                subdomain,
                content: JSON.stringify(content),
                chatEnabled: content.chatEnabled,
                theme: JSON.stringify({ primary: 'blue', font: 'inter' })
            },
            create: {
                adminId: user.id,
                subdomain,
                content: JSON.stringify(content),
                chatEnabled: content.chatEnabled,
                theme: JSON.stringify({ primary: 'blue', font: 'inter' })
            }
        })

        return NextResponse.json(website)

    } catch (error) {
        console.error('Website generation error:', error)
        return NextResponse.json({
            error: 'Failed to generate website',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
