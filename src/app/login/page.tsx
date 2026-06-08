'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChartColumnIncreasing, Eye, EyeOff, Loader2, Route, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/LanguageContext'

const roleRoutes: Record<string, string> = {
  SUPER_ADMIN: '/super-admin',
  MIDDLE_ADMIN: '/middle-admin',
  LOW_ADMIN: '/low-admin',
  COURIER: '/courier',
}

export default function LoginPage() {
  const router = useRouter()
  const { t, language } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const uiText = useMemo(
    () => ({
      en: {
        autoOrders: 'Auto orders',
        autoOrdersDetail: 'Recurring order scheduling.',
        dispatch: 'Dispatch',
        dispatchDetail: 'Courier and route control.',
        finance: 'Finance',
        financeDetail: 'Debt and salary visibility.',
        configError: 'Server configuration error',
        invalidCreds: 'Invalid email or password',
        connectionError: 'Could not connect to server',
        accessBadge: 'Operations access',
        headline: 'Sign in to manage delivery operations',
        description: 'Use your admin account to access orders, clients, couriers, and finance tools.',
        cardSubtitle: 'Enter platform',
        noAccount: 'No account?',
        startTrial: 'Start free trial',
        policiesSoon: 'Policy pages coming soon.',
        passwordRecoverySoon: 'Password recovery coming soon.',
        hidePassword: 'Hide password',
        showPassword: 'Show password',
        or: 'or',
        continueGoogle: 'Continue with Google',
      },
      uz: {
        autoOrders: 'Avto buyurtmalar',
        autoOrdersDetail: 'Takroriy buyurtmalar jadvali.',
        dispatch: 'Dispecher',
        dispatchDetail: 'Kuryer va marshrut nazorati.',
        finance: 'Moliya',
        financeDetail: 'Qarz va maosh korinishi.',
        configError: 'Server sozlamasi xatosi',
        invalidCreds: 'Email yoki parol notogri',
        connectionError: 'Server bilan ulanishda xato',
        accessBadge: 'Operatsion kirish',
        headline: 'Yetkazib berish jarayonini boshqarish uchun kiring',
        description: 'Buyurtma, mijoz, kuryer va moliya vositalariga admin hisob bilan kiring.',
        cardSubtitle: 'Platformaga kirish',
        noAccount: 'Hisobingiz yoqmi?',
        startTrial: 'Bepul sinovni boshlash',
        policiesSoon: 'Siyosat sahifalari tez orada.',
        passwordRecoverySoon: 'Parolni tiklash tez orada.',
        hidePassword: 'Parolni yashirish',
        showPassword: 'Parolni korsatish',
        or: 'yoki',
        continueGoogle: 'Google orqali davom etish',
      },
      ru: {
        autoOrders: 'Авто-заказы',
        autoOrdersDetail: 'Регулярное создание заказов.',
        dispatch: 'Диспетчеризация',
        dispatchDetail: 'Контроль курьеров и маршрутов.',
        finance: 'Финансы',
        financeDetail: 'Видимость долгов и зарплат.',
        configError: 'Ошибка конфигурации сервера',
        invalidCreds: 'Неверный email или пароль',
        connectionError: 'Не удалось подключиться к серверу',
        accessBadge: 'Операционный доступ',
        headline: 'Войдите для управления доставкой',
        description: 'Используйте аккаунт админа для заказов, клиентов, курьеров и финансов.',
        cardSubtitle: 'Вход в платформу',
        noAccount: 'Нет аккаунта?',
        startTrial: 'Начать бесплатный период',
        policiesSoon: 'Страницы политики скоро появятся.',
        passwordRecoverySoon: 'Восстановление пароля скоро появится.',
        hidePassword: 'Скрыть пароль',
        showPassword: 'Показать пароль',
        or: 'или',
        continueGoogle: 'Продолжить через Google',
      },
    })[language],
    [language]
  )

  const highlights = useMemo(
    () => [
      { icon: Zap, label: uiText.autoOrders, detail: uiText.autoOrdersDetail },
      { icon: Route, label: uiText.dispatch, detail: uiText.dispatchDetail },
      { icon: ChartColumnIncreasing, label: uiText.finance, detail: uiText.financeDetail },
    ],
    [uiText]
  )

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error')
    if (err) {
      toast.error(t.common.error, {
        description: err === 'Configuration' ? uiText.configError : err,
      })
    }
  }, [t.common.error, uiText.configError])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', { email, password, redirect: false })

      if (result?.error) {
        toast.error(t.common.error, {
          description: result.error === 'CredentialsSignin' ? uiText.invalidCreds : result.error,
        })
        return
      }

      const session = await getSession()
      const role = session?.user?.role
      const destination = roleRoutes[role ?? ''] ?? '/middle-admin'

      toast.success(t.common.success, { description: t.auth.welcome })
      router.replace(destination)
      router.refresh()
    } catch {
      toast.error(t.common.error, { description: uiText.connectionError })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      badge={uiText.accessBadge}
      headline={uiText.headline}
      description={uiText.description}
      highlights={highlights}
      cardTitle={t.auth.loginTitle}
      cardSubtitle={uiText.cardSubtitle}
      footer={
        <div className="space-y-2 text-center text-xs text-muted-foreground">
          <p>
            {uiText.noAccount}{' '}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              {uiText.startTrial}
            </Link>
          </p>
          <p>
            <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => toast.info(uiText.policiesSoon)}>
              {t.auth.privacyPolicy}
            </Button>
            {' · '}
            <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => toast.info(uiText.policiesSoon)}>
              {t.auth.termsOfUse}
            </Button>
          </p>
        </div>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            placeholder="admin@autofood.uz"
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => toast.info(uiText.passwordRecoverySoon)}>
              {t.auth.forgotPassword}
            </Button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1 h-7 w-7 rounded-base text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? uiText.hidePassword : uiText.showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.common.loading}
            </>
          ) : (
            <>
              {t.auth.signIn}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
 <span className="w-full" />
        </div>
        <div className="relative flex justify-center">
 <span className="rounded-base bg-background px-2 py-0.5 text-xs text-muted-foreground">{uiText.or}</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="h-10 w-full" onClick={() => signIn('google', { callbackUrl: '/auth/redirect' })}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {uiText.continueGoogle}
      </Button>
    </AuthShell>
  )
}
