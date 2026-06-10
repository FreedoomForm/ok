import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Metadata } from 'next'
import { parseSiteContent, parseThemePayload } from '@/modules/sites/infrastructure/site-builder'

// Force dynamic rendering to handle subdomains correctly
export const dynamic = 'force-dynamic'

interface SiteLayoutProps {
    children: React.ReactNode
    params: Promise<{ subdomain: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
    const { subdomain } = await params
    const website = await db.website.findUnique({
        where: { subdomain }
    })

    if (!website) return { title: 'Site Not Found' }

    const content = parseSiteContent(website.content, subdomain)
    return {
        title: content.hero.title.en, // Default to English for metadata
        description: content.hero.subtitle.en
    }
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
    const { subdomain } = await params
    const website = await db.website.findUnique({
        where: { subdomain }
    })

    if (!website) {
        notFound()
    }

    const theme = parseThemePayload(website.theme)
    const palette = theme.palette

    return (
        <div className="min-h-screen antialiased">
            <style dangerouslySetInnerHTML={{
                __html: `
                    :root {
                        --site-bg: ${palette.pageBackground};
                        --site-panel: ${palette.panelBackground};
                        --site-text: ${palette.textPrimary};
                        --site-muted: ${palette.textMuted};
 --site-};
                        --site-accent: ${palette.accent};
                        --site-accent-soft: ${palette.accentSoft};
                        --site-hero-from: ${palette.heroFrom};
                        --site-hero-to: ${palette.heroTo};
                        --site-hero-text: ${palette.heroText};
                    }
                `
            }} />
            {children}
        </div>
    )
}
