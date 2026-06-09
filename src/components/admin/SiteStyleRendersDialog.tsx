'use client'

import { useMemo, useState } from 'react'
import { LogIn, ReceiptText, Sparkles, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SiteConfig } from '@/hooks/useSiteConfig'
import type { SiteStylePreset, SiteRenderPageId } from '@/lib/site-builder'
import { SiteClientNav, SiteHero, SitePageSurface, SitePanel, SitePublicHeader } from '@/components/site/SiteScaffold'

function buildPreviewSite(preset: SiteStylePreset, siteName: string, subdomain: string): SiteConfig {
  return {
    id: 'preview',
    subdomain,
    adminId: 'preview',
    chatEnabled: false,
    styleVariant: preset.id,
    palette: preset.palette,
    siteName: siteName || 'Company',
    headingClass: preset.headingClass,
    bodyClass: preset.bodyClass,
  }
}

function PreviewLanding({ site }: { site: SiteConfig }) {
  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />
      <SiteHero
        title={`${site.siteName} - Daily meals`}
        subtitle="Profile, today menu, and order history in one client cabinet."
      />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Today menu', icon: Sparkles, desc: 'Daily dishes configured by your middle-admin.' },
            { title: 'Balance', icon: Wallet, desc: 'Track balance and payments.' },
          ].map((item) => (
            <SitePanel key={item.title} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <item.icon className="h-4 w-4" />
                {item.title}
              </div>
              <p className="text-sm" style={{ color: 'var(--site-muted)' }}>{item.desc}</p>
            </SitePanel>
          ))}
        </div>
      </main>
    </SitePageSurface>
  )
}

function PreviewLogin({ site, mode }: { site: SiteConfig; mode: 'login' | 'register' }) {
  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SitePanel className="mx-auto w-full max-w-lg space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">{mode === 'login' ? 'Login with Phone' : 'Register'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'login' ? 'Enter phone number to login.' : 'Register by phone number.'}
            </p>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input value="Alex" readOnly />
            </div>
          )}

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value="+998901234567" readOnly />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-2">
              <LogIn className="h-4 w-4" /> {mode === 'login' ? 'Login' : 'Register'}
            </Button>
          </div>
        </SitePanel>
      </main>
    </SitePageSurface>
  )
}

function PreviewClient({ site }: { site: SiteConfig }) {
  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Client Home</h1>
          <SiteClientNav subdomain={site.subdomain} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SitePanel>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>Balance</h2>
                <p className="mt-1 text-3xl font-semibold">120,000 UZS</p>
              </div>
              <Wallet className="h-5 w-5" style={{ color: 'var(--site-accent)' }} />
            </div>
          </SitePanel>

          <SitePanel>
            <h2 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>Plan status</h2>
            <p className="mt-2 text-lg font-semibold">Active</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>Toggle plan to pause deliveries starting today.</p>
          </SitePanel>
        </div>

        <SitePanel>
          <h2 className="text-xl font-semibold">Today menu</h2>
          <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Day #7</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
              <div
                key={meal}
 className="rounded-xl p-3"
 style={{ backgroundColor: 'var(--site-bg)' }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-muted)' }}>{meal}</p>
                <p className="mt-1 font-medium">Dish example</p>
              </div>
            ))}
          </div>
        </SitePanel>
      </main>
    </SitePageSurface>
  )
}

function PreviewHistory({ site }: { site: SiteConfig }) {
  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Order History</h1>
          <SiteClientNav subdomain={site.subdomain} />
        </div>

        <SitePanel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
 <tr className="" style={{ }}>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Calories</th>
                  <th className="px-2 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 1, status: 'DELIVERED', cal: 1600, date: '2026-02-22' },
                  { id: 2, status: 'PAUSED', cal: 2000, date: '2026-02-23' },
                ].map((row) => (
 <tr key={row.id} className="" style={{ }}>
                    <td className="px-2 py-2">{row.id}</td>
                    <td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2">{row.cal}</td>
                    <td className="px-2 py-2">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SitePanel>
      </main>
    </SitePageSurface>
  )
}

function PagePreview({ page, preset, siteName, subdomain }: {
  page: SiteRenderPageId
  preset: SiteStylePreset
  siteName: string
  subdomain: string
}) {
  const site = useMemo(() => buildPreviewSite(preset, siteName, subdomain), [preset, siteName, subdomain])

  // Prevent clicks/links inside previews from navigating away.
  return (
    <div className="pointer-events-none select-none">
      {page === 'landing' && <PreviewLanding site={site} />}
      {page === 'login' && <PreviewLogin site={site} mode="login" />}
      {page === 'register' && <PreviewLogin site={site} mode="register" />}
      {page === 'history' && <PreviewHistory site={site} />}
      {page === 'client' && <PreviewClient site={site} />}
    </div>
  )
}

export function SiteStyleRendersDialog({
  open,
  onOpenChange,
  preset,
  siteName,
  subdomain,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preset: SiteStylePreset | null
  siteName: string
  subdomain: string
}) {
  const [page, setPage] = useState<SiteRenderPageId>('landing')

  const title = preset ? `${preset.title} renders` : 'Style renders'

  if (!preset) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Style renders</DialogTitle>
            <DialogDescription>Select a style to preview renders.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>
            Render preview of 5 pages for this style. Company name and subdomain are taken from Profile settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label>Company name</Label>
                <Input value={siteName || ''} readOnly />
              </div>
              <div className="grid gap-2">
                <Label>Subdomain</Label>
                <Input value={subdomain || ''} readOnly />
              </div>
              <div className="grid gap-2">
                <Label>Pages</Label>
                <Tabs value={page} onValueChange={(v) => setPage(v as SiteRenderPageId)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="landing">Landing</TabsTrigger>
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                    <TabsTrigger value="client" className="col-span-2 flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" /> Client
                    </TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value={page} className="mt-3">
                    <div className="text-xs text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{page}</span>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Balance + today menu are mocked for preview.
              </div>
              <Button type="button" variant="outline" onClick={() => setPage('landing')}>Reset to landing</Button>
            </CardContent>
          </Card>

 <div className="rounded-xl bg-muted/30 p-2">
            <div className="overflow-hidden rounded-lg bg-background">
              <div className="max-h-[72vh] overflow-auto">
                <PagePreview
                  page={page}
                  preset={preset}
                  siteName={siteName}
                  subdomain={subdomain}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
