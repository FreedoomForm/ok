import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SiteContent } from '@/components/site/SiteContent'
import { parseSiteContent, parseThemePayload } from '@/lib/site-builder'

interface PageProps {
    params: { subdomain: string }
}

export default async function SitePage({ params }: PageProps) {
    const website = await db.website.findUnique({
        where: { subdomain: params.subdomain }
    })

    if (!website) {
        notFound()
    }

    const content = parseSiteContent(website.content, params.subdomain)
    const theme = parseThemePayload(website.theme)
    const inferredSiteName = content.about.title.en.replace(/^About\s+/, '') || params.subdomain

    return <SiteContent content={content} subdomain={params.subdomain} siteName={inferredSiteName} styleVariant={theme.styleVariant} />
}
