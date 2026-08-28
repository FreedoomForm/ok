'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Check, Heart, Leaf, LogIn, MessageCircle, Shield, Sparkles, UserPlus, Wallet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GeneratedSiteContent } from '@/lib/ai-site-generator'
import { makeClientSiteHref } from '@/lib/site-urls'
import { SiteHero, SitePageSurface, SitePanel, SitePublicHeader } from '@/components/site/SiteScaffold'
import { getStylePreset, type SiteStyleVariant } from '@/lib/site-builder'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { language, setLanguage } = useLanguage()
  const theme = getStylePreset(styleVariant)

  const t = (obj: { uz: string; ru: string; en: string }) => obj[language]
  const copy = language === 'uz'
    ? { eyebrow: 'Shaxsiy ovqat yetkazib berish portali', asideTitle: 'Portal imkoniyatlari', asideDetail: 'Mijozlar ro‘yxatdan o‘tishi, telefon orqali kirishi, balansini kuzatishi, kunlik menyuni ko‘rishi va yetkazib berish tarixini tekshirishi mumkin.', login: 'Kirish', register: 'Ro‘yxatdan o‘tish', languages: 'Tillar', modules: 'Asosiy modullar', access: 'Portalga kirish', clientsGet: 'Mijozlar nimalarga ega bo‘ladi', clientsGetTitle: 'Xizmatga aniqroq kirish', clientsGetDescription: 'Sayt xizmatni tanishtiradi va mijozni kerakli hisob vositalariga olib boradi.', availablePages: 'Mavjud sahifalar', availablePagesDescription: 'Har bir sahifa alohida ekranlar to‘plami emas, yagona portal oqimining bir qismidir.', landing: 'Bosh sahifa', clientHome: 'Mijoz kabineti', history: 'Tarix', phoneAccess: 'Telefon orqali kirish', phoneAccessDescription: 'Ro‘yxatdan o‘tish va kirish mijozni tez ulash uchun moslangan.', operations: 'Kunlik operatsiyalar ravshanligi', operationsDescription: 'Balans, menyu, reja holati va tarix qo‘shimcha qo‘ng‘iroqlarsiz ko‘rinadi.', plans: 'Rejalar' }
    : { eyebrow: 'Персональный портал доставки питания', asideTitle: 'Возможности портала', asideDetail: 'Клиенты могут зарегистрироваться, войти по телефону, проверить баланс, открыть меню на день и посмотреть историю доставки.', login: 'Войти', register: 'Регистрация', languages: 'Языка', modules: 'Основных модуля', access: 'Доступ к порталу', clientsGet: 'Что получают клиенты', clientsGetTitle: 'Понятный вход в сервис', clientsGetDescription: 'Сайт знакомит с сервисом и сразу ведет клиента к нужным инструментам кабинета.', availablePages: 'Доступные страницы', availablePagesDescription: 'Каждая страница — часть единого потока портала, а не отдельный экран.', landing: 'Главная', clientHome: 'Кабинет клиента', history: 'История', phoneAccess: 'Вход по телефону', phoneAccessDescription: 'Регистрация и вход сделаны для быстрого подключения клиента.', operations: 'Понятные ежедневные операции', operationsDescription: 'Баланс, меню, статус плана и история видны без дополнительных обращений.', plans: 'Планы' }
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
    { label: copy.languages, value: '2' },
    { label: copy.modules, value: `${content.features.length + 2}` },
    { label: copy.access, value: '24/7' },
  ]

  return (
    <SitePageSurface site={site}>
      <SitePublicHeader
        site={site}
        rightSlot={
          <div
            className="flex items-center gap-2 rounded-lg border px-2 py-1"
            style={{ borderColor: 'var(--site-border)', backgroundColor: 'color-mix(in srgb, var(--site-panel) 96%, white)' }}
          >
            {(['uz', 'ru'] as const).map((option) => (
              <Button
                key={option}
                variant={language === option ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage(option)}
                className="h-8 rounded-md px-3 uppercase"
              >
                {option}
              </Button>
            ))}
          </div>
        }
      />

      <SiteHero
        eyebrow={copy.eyebrow}
        title={t(content.hero.title)}
        subtitle={t(content.hero.subtitle)}
        asideTitle={copy.asideTitle}
        asideDetail={copy.asideDetail}
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
                {copy.login}
              </Button>
            </Link>
            <Link href={href('/register')}>
              <Button size="lg" variant="outline" className="px-6">
                <UserPlus className="h-4 w-4" />
                {copy.register}
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
              {copy.clientsGet}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{copy.clientsGetTitle}</h2>
          </div>
          <p className="max-w-md text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
            {copy.clientsGetDescription}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {content.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Zap
            return (
              <Card
                key={index}
                className="rounded-xl border"
                style={{
                  backgroundColor: 'var(--site-panel)',
                  borderColor: 'var(--site-border)',
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
            <h2 className="text-2xl font-semibold">{copy.availablePages}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
              {copy.availablePagesDescription}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: href(''), label: copy.landing },
            { href: href('/login'), label: copy.login },
            { href: href('/register'), label: copy.register },
            { href: href('/client'), label: copy.clientHome },
            { href: href('/history'), label: copy.history },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className="rounded-xl border p-5 transition-colors hover:bg-muted/20"
                style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}
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
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--site-border)', backgroundColor: 'color-mix(in srgb, var(--site-accent-soft) 24%, white)' }}>
              <p className="text-sm font-medium">{copy.phoneAccess}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
                {copy.phoneAccessDescription}
              </p>
            </div>
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--site-border)', backgroundColor: 'color-mix(in srgb, var(--site-accent-soft) 24%, white)' }}>
              <p className="text-sm font-medium">{copy.operations}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--site-muted)' }}>
                {copy.operationsDescription}
              </p>
            </div>
          </div>
        </SitePanel>

        <SitePanel className="space-y-4">
          <h2 className="text-2xl font-semibold">{copy.plans}</h2>
          {content.pricing.map((plan, index) => (
            <div
              key={index}
              className="rounded-xl border px-5 py-5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--site-panel) 90%, white)',
                borderColor: 'var(--site-border)',
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
