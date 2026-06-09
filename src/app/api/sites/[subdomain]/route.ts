import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseSiteContent, parseThemePayload } from '@/lib/site-builder'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ subdomain: string }> }
) {
    try {
        const { subdomain } = await context.params
        const website = await db.website.findUnique({
            where: { subdomain },
            select: {
                id: true,
                subdomain: true,
                adminId: true,
                chatEnabled: true,
                theme: true,
                content: true
            }
        })

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 })
        }

        const theme = parseThemePayload(website.theme)
        const content = parseSiteContent(website.content, subdomain)

        return NextResponse.json({
            id: website.id,
            subdomain: website.subdomain,
            adminId: website.adminId,
            chatEnabled: website.chatEnabled,
            styleVariant: theme.styleVariant,
            palette: theme.palette,
            siteName: content.about.title.en.replace(/^About\s+/, '') || subdomain,
            content
        })

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
