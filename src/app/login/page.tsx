'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Mail, Lock, ArrowRight, CheckCircle2, Truck, ShieldCheck, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

import { signIn, getSession } from 'next-auth/react'

export default function Home() {
  const { t } = useLanguage()
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check for URL error parameters (e.g. from Google Auth failure)
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      setUrlError(errorParam)
      toast.error(t.common.error, {
        description: errorParam === 'Configuration' ? 'Server configuration error' : errorParam
      })
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      })

      if (result?.error) {
        console.error('Login error:', result.error)
        toast.error(t.common.error, {
          description: result.error === 'CredentialsSignin'
            ? 'Invalid email or password'
            : result.error
        })
      } else {
        // Fetch session to get role
        const session = await getSession()
        const role = session?.user?.role

        toast.success(t.common.success, {
          description: t.auth.welcome
        })

        // Small delay for animation
        setTimeout(() => {
          switch (role) {
            case 'SUPER_ADMIN':
              window.location.href = '/super-admin'
              break
            case 'MIDDLE_ADMIN':
              window.location.href = '/middle-admin'
              break
            case 'LOW_ADMIN':
              window.location.href = '/low-admin'
              break
            case 'COURIER':
              window.location.href = '/courier'
              break
            default:
              // Fallback if role is missing or unknown
              window.location.href = '/middle-admin'
          }
        }, 800)
      }
    } catch (err) {
      toast.error(t.common.error, { description: 'Не удалось соединиться с сервером' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden">
      {/* Left Side - Hero/Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-primary overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1616401784845-180886ba9ca8?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-900/90 backdrop-blur-sm"></div>

        <div className="relative z-10 max-w-xl px-12 text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                <Truck className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">AutoFood</h1>
            </div>

            <h2 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              {t.auth.welcome} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                AutoFood
              </span>
            </h2>

            <p className="text-lg text-primary-foreground/80 mb-12 leading-relaxed">
              {t.auth.loginSubtitle}
            </p>


            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: ShieldCheck, title: "Безопасность", desc: "Защита данных уровня Enterprise" },
                { icon: BarChart3, title: "Аналитика", desc: "Детальные отчеты в реальном времени" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (i * 0.2) }}
                  className="flex gap-4 items-start"
                >
                  <div className="p-2 bg-white/10 rounded-lg mt-1">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-primary-foreground/60">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10"></div>
        <div className="absolute top-8 right-8">
          <LanguageSwitcher />
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="glass-intense border-none shadow-2xl animate-scale-in">
            <CardHeader className="space-y-1 text-center pb-8">
              <CardTitle className="text-3xl font-bold tracking-tight">{t.auth.loginTitle}</CardTitle>
              <CardDescription className="text-base">
                {t.auth.loginSubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@autofood.uz"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary/50 transition-all"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => toast.info('Скоро будет доступно')}>
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary/50 transition-all"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] btn-3d ripple"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t.common.loading}
                    </>
                  ) : (
                    <>
                      {t.auth.signIn}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Google Sign In */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-base font-medium border-2 hover:bg-secondary/50"
                onClick={() => signIn('google')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>


            </CardContent>
            <CardFooter className="flex-col space-y-4 border-t border-muted/50 pt-6">
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <a href="/signup" className="font-medium text-primary hover:underline">
                  Sign up for free
                </a>
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Защищено reCAPTCHA и применяются
                <button type="button" className="underline hover:text-primary ml-1" onClick={() => toast.info('Скоро будет доступно')}>{t.auth.privacyPolicy}</button> и
                <button type="button" className="underline hover:text-primary ml-1" onClick={() => toast.info('Скоро будет доступно')}>{t.auth.termsOfUse}</button>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>

  )
}
