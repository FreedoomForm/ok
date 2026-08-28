'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, LogIn, ShieldCheck, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { SiteAuthShell } from '@/components/site/SiteAuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { makeClientSiteHref } from '@/lib/site-urls'
import { useLanguage } from '@/contexts/LanguageContext'

function normalizePhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1).replace(/\D/g, '') : trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `+${digits}`
}

export default function LoginPage({ params }: { params: { subdomain: string } }) {
  const router = useRouter()
  const { site, isLoading } = useSiteConfig(params.subdomain)
  const { language } = useLanguage()
  const text = language === 'uz'
    ? { badge: 'Mijoz kirishi', title: 'Telefon raqamingiz bilan kiring', description: 'Hisobingizga ulangan telefon raqamidan foydalanib boshqaruv panelini oching, faol yetkazib berishlarni kuzating va joylashuvingizni yangilang.', phoneLogin: 'Telefon orqali kirish', phoneLoginDescription: 'Parolsiz tezkor kirish.', dashboard: 'Boshqaruv paneliga to‘g‘ridan-to‘g‘ri', dashboardDescription: 'Kirgandan so‘ng balans, buyurtmalar va menyuni ko‘rasiz.', formTitle: 'Kirish', formDescription: 'Telefon raqamingizni xalqaro formatda kiriting.', phone: 'Telefon raqami', secureTitle: 'Tezkor xavfsiz kirish', secureDescription: 'Sessiyangiz ushbu qurilma tokeniga bog‘langan va chiqish orqali bekor qilinishi mumkin.', newClient: 'Yangi mijozmisiz?', createAccount: 'Hisob yaratish', invalidPhone: 'Yaroqli telefon raqamini kiriting', loginFailed: 'Kirish amalga oshmadi', loginSuccess: 'Muvaffaqiyatli kirildi', siteNotFound: 'Sayt topilmadi' }
    : { badge: 'Доступ клиента', title: 'Вход по номеру телефона', description: 'Используйте номер телефона, привязанный к аккаунту, чтобы открыть кабинет, отслеживать активные доставки и обновлять местоположение.', phoneLogin: 'Вход по телефону', phoneLoginDescription: 'Быстрый вход без сложных паролей.', dashboard: 'Сразу в кабинет', dashboardDescription: 'После входа доступны баланс, заказы и меню.', formTitle: 'Войти', formDescription: 'Введите телефон в международном формате.', phone: 'Номер телефона', secureTitle: 'Быстрый защищенный вход', secureDescription: 'Сессия связана с токеном этого устройства и может быть отозвана при выходе.', newClient: 'Новый клиент?', createAccount: 'Создать аккаунт', invalidPhone: 'Введите корректный номер телефона', loginFailed: 'Не удалось войти', loginSuccess: 'Вход выполнен', siteNotFound: 'Сайт не найден' }
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('customerToken')
        const res = await fetch('/api/customers/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (res.ok) {
          router.replace(makeClientSiteHref(params.subdomain, '/client'))
        }
      } catch {
        // ignore
      }
    }

    void run()
  }, [params.subdomain, router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!normalizedPhone) {
      toast.error(text.invalidPhone)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/sites/${params.subdomain}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(text.loginFailed)
      }

      localStorage.setItem('customerToken', data.token)
      localStorage.setItem('customerInfo', JSON.stringify(data.customer))
      toast.success(text.loginSuccess)
      router.replace(makeClientSiteHref(params.subdomain, '/client'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.loginFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-medium">{text.siteNotFound}</p>
        </div>
      </div>
    )
  }

  return (
    <SiteAuthShell
      site={site}
      subdomain={params.subdomain}
      badge={text.badge}
      title={text.title}
      description={text.description}
      features={[
        {
          icon: Smartphone,
          title: text.phoneLogin,
          description: text.phoneLoginDescription,
        },
        {
          icon: ArrowRight,
          title: text.dashboard,
          description: text.dashboardDescription,
        },
      ]}
      formTitle={text.formTitle}
      formDescription={text.formDescription}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{text.phone}</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+998901234567"
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !normalizedPhone} className="w-full gap-2 rounded-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {text.formTitle}
        </Button>
      </form>

      <div className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-accent-soft)' }}>
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4" />
          {text.secureTitle}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {text.secureDescription}
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {text.newClient}{' '}
        <Link href={makeClientSiteHref(params.subdomain, '/register')} className="font-medium underline">
          {text.createAccount}
        </Link>
      </p>
    </SiteAuthShell>
  )
}
