import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isLikelySubdomainHost } from '@/lib/site-urls'

export default async function DashboardPage({ params }: { params: Promise<{ subdomain: string }> }) {
    const { subdomain } = await params
    const host = (await headers()).get('host') || ''
    const cleanRedirect = isLikelySubdomainHost(host, subdomain)
    redirect(cleanRedirect ? '/client' : `/sites/${subdomain}/client`)
}
