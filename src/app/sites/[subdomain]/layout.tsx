import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Metadata } from 'next'

// Force dynamic rendering to handle subdomains correctly
export const dynamic = 'force-dynamic'

interface SiteLayoutProps {
    children: React.ReactNode
    params: { subdomain: string }
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
    const website = await db.website.findUnique({
        where: { subdomain: params.subdomain }
    })

    if (!website) return { title: 'Site Not Found' }

    const content = JSON.parse(website.content)
    return {
        title: content.hero.title.en, // Default to English for metadata
        description: content.hero.subtitle.en
    }
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
    const website = await db.website.findUnique({
        where: { subdomain: params.subdomain }
    })

    if (!website) {
        notFound()
    }

    // Apply theme (simplified for now)
    const theme = JSON.parse(website.theme)

    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {/* We could inject CSS variables here for theming */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    :root {
                        --primary: ${theme.primary === 'blue' ? '221.2 83.2% 53.3%' : '142.1 76.2% 36.3%'};
                    }
                `
            }} />
            {children}
        </div>
    )
}
