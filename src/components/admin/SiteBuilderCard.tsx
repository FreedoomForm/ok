'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe, Loader2, MessageSquare, Save, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { IconButton } from '@/components/ui/icon-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { buildSubdomainHost, buildSubdomainUrl, usesPathRoutingForSubdomains } from '@/lib/subdomain-host'
import { DEFAULT_STYLE_VARIANT, normalizeSubdomain, type SiteStyleVariant } from '@/lib/site-builder'

type WebsiteSettingsResponse = {
  website: {
    id: string | null
    subdomain: string
    siteName: string
    styleVariant: SiteStyleVariant
  }
  baseHost: string
}

export function SiteBuilderCard() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSubdomain, setIsSavingSubdomain] = useState(false)
  const [baseHost, setBaseHost] = useState('localhost:3000')
  const [subdomain, setSubdomain] = useState('')
  const [siteName, setSiteName] = useState('')
  const [styleVariant, setStyleVariant] = useState<SiteStyleVariant>(DEFAULT_STYLE_VARIANT)
  const [aiPrompt, setAiPrompt] = useState('')

  const normalizedSubdomain = useMemo(() => normalizeSubdomain(subdomain), [subdomain])

  const pathPreviewUrl = useMemo(() => {
    if (!normalizedSubdomain) return ''
    return `/sites/${normalizedSubdomain}`
  }, [normalizedSubdomain])

  const hostPreviewUrl = useMemo(() => {
    if (!normalizedSubdomain) return ''
    return buildSubdomainUrl(normalizedSubdomain, baseHost)
  }, [baseHost, normalizedSubdomain])

  const isPathRouting = useMemo(() => usesPathRoutingForSubdomains(baseHost), [baseHost])

  const hostLabel = useMemo(() => {
    if (!normalizedSubdomain) return '-'
    if (isPathRouting) return `${baseHost}/sites/${normalizedSubdomain}`
    return buildSubdomainHost(normalizedSubdomain, baseHost)
  }, [baseHost, isPathRouting, normalizedSubdomain])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/website')
        if (!response.ok) {
          throw new Error('Failed to load website settings')
        }

        const data = (await response.json()) as WebsiteSettingsResponse
        setSubdomain(data.website.subdomain || '')
        setSiteName(data.website.siteName || '')
        setStyleVariant(data.website.styleVariant || DEFAULT_STYLE_VARIANT)
        setBaseHost(data.baseHost || 'localhost:3000')
      } catch (error) {
        // eslint-disable-next-line no-console -- preserve dashboard diagnostics for failed fetches
        console.error(error)
        toast.error(error instanceof Error ? error.message : 'Failed to load website settings')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const openTamboChat = (prompt?: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('tambo:open-chat', {
        detail: {
          prompt: prompt?.trim() || undefined,
        },
      })
    )
  }

  const handleSaveSubdomain = async () => {
    const nextSubdomain = normalizeSubdomain(subdomain)

    if (!nextSubdomain) {
      toast.error('Subdomain is required')
      return
    }

    setIsSavingSubdomain(true)

    try {
      const response = await fetch('/api/admin/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: siteName || 'My Site',
          subdomain: nextSubdomain,
          styleVariant,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save subdomain URL')
      }

      setSubdomain(nextSubdomain)
      toast.success('Subdomain URL saved')
    } catch (error) {
      // eslint-disable-next-line no-console -- preserve dashboard diagnostics for failed save attempts
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save subdomain URL')
    } finally {
      setIsSavingSubdomain(false)
    }
  }

  const handleSendPrompt = () => {
    const trimmed = aiPrompt.trim()
    if (!trimmed) {
      toast.error('Write a prompt for Tambo AI first')
      return
    }

    openTamboChat(trimmed)
    toast.success('Prompt sent to Tambo AI chat')
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading website preview...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subdomain URL</CardTitle>
          <CardDescription>
            {isPathRouting
              ? 'Set subdomain and open website with Vercel path URL mode.'
              : 'Set subdomain and open website directly.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="subdomainUrlInput">Subdomain</Label>
              <Input
                id="subdomainUrlInput"
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value)}
                placeholder="healthy-meals"
                className="border-border bg-background"
              />
              <div className="text-xs text-muted-foreground">
                Host: {hostLabel}
              </div>
            </div>
            <IconButton
              label="Set subdomain URL"
              type="button"
              iconSize="md"
              onClick={() => void handleSaveSubdomain()}
              disabled={isSavingSubdomain}
            >
              {isSavingSubdomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </IconButton>
          </div>

          <div className="flex flex-wrap gap-2">
            <IconButton
              label="Open path preview"
              type="button"
              iconSize="md"
              variant="outline"
              disabled={!pathPreviewUrl}
              onClick={() => window.open(pathPreviewUrl, '_blank', 'noopener,noreferrer')}
            >
              <Globe className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Go to subdomain URL"
              type="button"
              iconSize="md"
              disabled={!hostPreviewUrl}
              onClick={() => window.open(hostPreviewUrl, '_blank', 'noopener,noreferrer')}
            >
              <Globe className="h-4 w-4" />
            </IconButton>
          </div>
        </CardContent>
      </Card>

      {normalizedSubdomain ? (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-2">
            <p className="text-sm font-semibold">{siteName || 'Website preview'}</p>
            <p className="text-xs text-muted-foreground">{hostLabel}</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <iframe
              title={`Subdomain preview ${normalizedSubdomain}`}
              src={pathPreviewUrl}
              loading="lazy"
              className="h-[420px] w-full bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Enter and save a subdomain to render website preview.
        </div>
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tambo AI website prompt</CardTitle>
          <CardDescription>
            Write what to improve on this subdomain website, then open Tambo AI chat with one click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="websiteAiPrompt">Prompt for Tambo AI</Label>
            <Textarea
              id="websiteAiPrompt"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Example: Improve hero section, add trust blocks, better CTA flow, and premium color system for conversion."
              className="min-h-24 border-border bg-background"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <IconButton
              label="Send to Tambo AI chat"
              type="button"
              iconSize="md"
              onClick={handleSendPrompt}
            >
              <Sparkles className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Open Tambo AI chat tab"
              type="button"
              iconSize="md"
              variant="outline"
              onClick={() => openTamboChat()}
            >
              <MessageSquare className="h-4 w-4" />
            </IconButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
