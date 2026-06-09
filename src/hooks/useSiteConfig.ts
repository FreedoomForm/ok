'use client'

import { useEffect, useState } from 'react'
import type { GeneratedSiteContent } from '@/lib/ai-site-generator'
import { getStylePreset, type SitePalette, type SiteStyleVariant } from '@/lib/site-builder'

export type SiteConfig = {
  id: string
  subdomain: string
  adminId: string
  chatEnabled: boolean
  styleVariant: SiteStyleVariant
  palette: SitePalette
  siteName: string
  headingClass: string
  bodyClass: string
  content?: GeneratedSiteContent
}

export function useSiteConfig(subdomain: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [site, setSite] = useState<SiteConfig | null>(null)

  useEffect(() => {
    if (!subdomain) return

    let isMounted = true

    const load = async () => {
      try {
        const response = await fetch(`/api/sites/${subdomain}`)
        if (!response.ok) {
          throw new Error('Site not found')
        }

        const data = await response.json()
        if (!isMounted) return

        const style = getStylePreset(data.styleVariant)

        setSite({
          id: data.id,
          subdomain: data.subdomain,
          adminId: data.adminId,
          chatEnabled: Boolean(data.chatEnabled),
          styleVariant: style.id,
          palette: {
            ...style.palette,
            ...(data.palette || {}),
          },
          siteName: data.siteName || subdomain,
          headingClass: style.headingClass,
          bodyClass: style.bodyClass,
          content: data.content,
        })
      } catch {
        if (!isMounted) return
        setSite(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [subdomain])

  return { site, isLoading }
}
