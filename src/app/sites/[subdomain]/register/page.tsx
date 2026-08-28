'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, NotebookTabs, UserPlus } from 'lucide-react'
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

export default function RegisterPage({ params }: { params: { subdomain: string } }) {
  const router = useRouter()
  const { site, isLoading } = useSiteConfig(params.subdomain)
  const { language } = useLanguage()
  const text = language === 'uz'
    ? { badge: 'Mijoz ro‘yxati', title: 'Kabinetga kirish yarating', description: 'Telefon raqamingiz bilan ro‘yxatdan o‘ting va balans, menyu hamda yetkazib berish yangilanishlarini kuzating.', onboarding: 'Oddiy boshlash', onboardingDescription: 'Ism ixtiyoriy, telefon raqami esa asosiy hisob kalitidir.', nextStep: 'Keyingi qadam tayyor', nextStepDescription: 'Ro‘yxatdan o‘tgach, shu telefon raqami bilan darhol kirishingiz mumkin.', formTitle: 'Ro‘yxatdan o‘tish', formDescription: 'Ro‘yxatdan o‘tish va kirish telefon raqami orqali amalga oshiriladi.', name: 'Ism (ixtiyoriy)', phone: 'Telefon raqami', already: 'Avval ro‘yxatdan o‘tganmisiz?', login: 'Kirish', invalidPhone: 'Yaroqli telefon raqamini kiriting', registrationFailed: 'Ro‘yxatdan o‘tib bo‘lmadi', registered: 'Ro‘yxatdan o‘tildi. Endi telefon raqamingiz bilan kiring.', siteNotFound: 'Sayt topilmadi' }
    : { badge: 'Регистрация клиента', title: 'Создайте доступ к кабинету', description: 'Зарегистрируйтесь по номеру телефона, чтобы пользоваться кабинетом, отслеживать баланс, меню и обновления доставки.', onboarding: 'Простая регистрация', onboardingDescription: 'Имя необязательно, телефон — основной ключ аккаунта.', nextStep: 'Следующий шаг готов', nextStepDescription: 'После регистрации можно сразу войти с тем же номером телефона.', formTitle: 'Регистрация', formDescription: 'Регистрация и вход выполняются по номеру телефона.', name: 'Имя (необязательно)', phone: 'Номер телефона', already: 'Уже зарегистрированы?', login: 'Войти', invalidPhone: 'Введите корректный номер телефона', registrationFailed: 'Не удалось зарегистрироваться', registered: 'Регистрация выполнена. Теперь войдите по номеру телефона.', siteNotFound: 'Сайт не найден' }
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!normalizedPhone) {
      toast.error(text.invalidPhone)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/sites/${params.subdomain}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          name: name.trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(text.registrationFailed)
      }

      toast.success(text.registered)
      router.replace(makeClientSiteHref(params.subdomain, '/login'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.registrationFailed)
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
          icon: NotebookTabs,
          title: text.onboarding,
          description: text.onboardingDescription,
        },
        {
          icon: ArrowRight,
          title: text.nextStep,
          description: text.nextStepDescription,
        },
      ]}
      formTitle={text.formTitle}
      formDescription={text.formDescription}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{text.name}</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex"
          />
        </div>

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
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {text.formTitle}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {text.already}{' '}
        <Link href={makeClientSiteHref(params.subdomain, '/login')} className="font-medium underline">
          {text.login}
        </Link>
      </p>
    </SiteAuthShell>
  )
}
