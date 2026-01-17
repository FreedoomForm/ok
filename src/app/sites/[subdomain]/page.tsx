import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SiteContent } from '@/components/site/SiteContent'

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

    const content = JSON.parse(website.content)

    return <SiteContent content={content} subdomain={params.subdomain} />
}
