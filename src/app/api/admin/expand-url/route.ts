import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { parseTrustedMapUrl } from '@/lib/safe-url'

const MAX_REDIRECTS = 5

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const initialUrl = parseTrustedMapUrl(url)
    if (!initialUrl) {
        return NextResponse.json({ error: 'Only trusted Google Maps URLs are supported' }, { status: 400 })
    }

    try {
        let currentUrl = initialUrl
        for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
            const response = await fetch(currentUrl, {
                method: 'HEAD',
                redirect: 'manual',
            })

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location')
                const nextUrl = location ? parseTrustedMapUrl(new URL(location, currentUrl).toString()) : null
                if (!nextUrl) {
                    return NextResponse.json({ error: 'Redirect target is not allowed' }, { status: 400 })
                }
                if (redirectCount === MAX_REDIRECTS) {
                    return NextResponse.json({ error: 'Too many redirects' }, { status: 502 })
                }
                currentUrl = nextUrl
                continue
            }

            if (!response.ok) {
                return NextResponse.json({ error: 'Failed to expand URL' }, { status: 502 })
            }

            return NextResponse.json({ expandedUrl: currentUrl.toString() })
        }

        return NextResponse.json({ error: 'Too many redirects' }, { status: 502 })
    } catch (error) {
        console.error('Error expanding URL:', error)
        return NextResponse.json({ error: 'Failed to expand URL' }, { status: 500 })
    }
}
