'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Check, Heart, Leaf, LogIn, MessageCircle, Shield, Sparkles, UserPlus, Wallet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GeneratedSiteContent } from '@/lib/ai-site-generator'
import { makeClientSiteHref } from '@/lib/site-urls'
import { SiteHero, SitePageSurface, SitePanel, SitePublicHeader } from '@/components/site/SiteScaffold'
import { getStylePreset, type SiteStyleVariant } from '@/lib/site-builder'

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Shield,
  Heart,
  Leaf,
  MessageCircle,
  Wallet,
}

interface SiteContentProps {
  content: GeneratedSiteContent
  subdomain: string
  siteName: string
  styleVariant?: SiteStyleVariant
}

export function SiteContent({ content, subdomain, siteName, styleVariant = 'organic-warm' }: SiteContentProps) {
  const [lang, setLang] = useState<'uz' | 'ru' | 'en'>('en')
  const theme = getStylePreset(styleVariant)

  const t = (obj: { uz: string; ru: string; en: string }) => obj[lang]
  const href = (path: string) => makeClientSiteHref(subdomain, path)

  const site = useMemo(
    () => ({
      id: 'preview',
      subdomain,
      adminId: '',
      chatEnabled: false,
      styleVariant: theme.id,
      palette: theme.palette,
      siteName,
      headingClass: theme.headingClass,
      bodyClass: theme.bodyClass,
      content,
    }),
    [content, siteName, subdomain, theme.bodyClass, theme.headingClass, theme.id, theme.palette]
  )

  const metrics = [
    { label: 'Languages', value: '3' },
    { label: 'Core modules', value: `${content.features.length + 2}` },
    { label: 'Portal access', value: '24/7' },
  ]

  return (
    <SitePageSurface site={site}>
      <SitePublicHeader
        site={site}
        rightSlot={
          <div
 className="flex items-center gap-2 rounded-lg px-2 py-1"
 style={{ backgroundColor: 'color-mix(in srgb, var(--site-panel) 96%, white)' }}
          >
            {(['uz', 'ru', 'en'] as const).map((language) => (
              <Button
                key={language}
                variant={lang === language ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLang(language)}
                className="h-8 rounded-md px-3 uppercase"
              >
                {language}
              </Button>
            ))}
          </div>
        }
      />

      <SiteHero
        eyebrow="Personalized meal delivery portal"
        title={t(content.hero.title)}
        subtitle={t(content.hero.subtitle)}
        asideTitle="Portal features"
        asideDetail="Clients can register, log in with phone number, monitor balance, follow daily menus, and review delivery history."
        actions={
          <>
            <Link href={href('/client')}>
              <Button size="lg" className="px-7">
                {t(content.hero.cta)}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={href('/login')}>
              <Button size="lg" variant="outline" className="px-6">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
            <Link href={href('/register')}>
              <Button size="lg" variant="outline" className="px-6">
                <UserPlus className="h-4 w-4" />
                Register
              </Button>
            </Link>
          </>
        }
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <SitePanel key={metric.label} className="rounded-xl p-5">
              <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--site-muted)' }}>
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
            </SitePanel>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: 'var(--site-accent)' }}>
              <Sparkles className="h-3.5 w-3.5" />
              What clients get
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">A clearer front door to the service</h2>
          </div>
          <p className="max-w-md text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
            The site introduces the service, then moves customers directly into the account tools they actually need.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {content.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Zap
            return (
              <Card
                key={index}
 className="rounded-xl"
                style={{
                  backgroundColor: 'var(--site-panel)',
 
                }}
              >
                <CardHeader>
                  <div
                    className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--site-accent-soft)', color: 'var(--site-accent)' }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{t(feature.title)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7" style={{ color: 'var(--site-muted)' }}>
                    {t(feature.description)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Available pages</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
              Every page is part of the same portal flow, not a disconnected collection of screens.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: href(''), label: 'Landing' },
            { href: href('/login'), label: 'Login' },
            { href: href('/register'), label: 'Register' },
            { href: href('/client'), label: 'Client Home' },
            { href: href('/history'), label: 'History' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div
 className="rounded-xl p-5 transition-colors hover:bg-muted/20"
 style={{ backgroundColor: 'var(--site-panel)' }}
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
                  {item.href}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
        <SitePanel className="space-y-4">
          <h2 className="text-2xl font-semibold">{t(content.about.title)}</h2>
          <p className="max-w-3xl leading-7" style={{ color: 'var(--site-muted)' }}>
            {t(content.about.description)}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
 <div className="rounded-lg px-4 py-4" style={{ backgroundColor: 'color-mix(in srgb, var(--site-accent-soft) 24%, white)' }}>
              <p className="text-sm font-medium">Phone-first access</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
                Registration and login are optimized for quick client onboarding.
              </p>
            </div>
 <div className="rounded-lg px-4 py-4" style={{ backgroundColor: 'color-mix(in srgb, var(--site-accent-soft) 24%, white)' }}>
              <p className="text-sm font-medium">Daily operations clarity</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
                Balance, menu, plan status, and history are visible without extra support calls.
              </p>
            </div>
          </div>
        </SitePanel>

        <SitePanel className="space-y-4">
          <h2 className="text-2xl font-semibold">Plans</h2>
          {content.pricing.map((plan, index) => (
            <div
              key={index}
 className="rounded-xl px-5 py-5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--site-panel) 90%, white)',
 
              }}
            >
              <p className="text-lg font-semibold">{t(plan.name)}</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--site-accent)' }}>
                {plan.price}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm" style={{ color: 'var(--site-muted)' }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--site-accent)' }} />
                    {t(feature)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </SitePanel>
      </section>
    </SitePageSurface>
  )
}
