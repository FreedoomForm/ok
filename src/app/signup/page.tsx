'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth/AuthShell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnimatedInput } from '@/components/smoothui'

export default function SignUpPage() {
  const router = useRouter()
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const highlights = useMemo(
    () => [
      { icon: Sparkles, label: '30-day trial', detail: 'Start with full access and no credit card required.' },
      { icon: ShieldCheck, label: 'Role-ready access', detail: 'Bring admins and couriers into one workspace.' },
      { icon: UserPlus, label: 'Fast onboarding', detail: 'Create account and start operations quickly.' },
    ],
    []
  )

  const passwordStrength = useMemo(() => {
    const password = signupData.password
    let score = 0
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
    if (/\d/.test(password)) score += 1
    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    return score
  }, [signupData.password])

  const strengthColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

  const handleGoogleSignUp = () => {
    signIn('google', { callbackUrl: '/auth/redirect' })
  }

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (signupData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        const nextError = data?.error || 'Failed to create account.'
        setError(nextError)
        toast.error('Sign-up error', { description: nextError })
        return
      }

      toast.success('Account created successfully.', {
        description: 'Your 30-day trial has started. Redirecting to login...',
      })
      router.replace('/login')
    } catch {
      setError('Could not connect to server.')
      toast.error('Connection error', { description: 'Could not connect to server.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      badge="30-day trial access"
      headline="Create your operations workspace"
      description="Register once and start using dispatch, warehouse, finance, and customer workflows."
      highlights={highlights}
      cardTitle="Create account"
      cardSubtitle="Start your AutoFood workspace"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" variant="outline" className="h-10 w-full" onClick={handleGoogleSignUp}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
 <span className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs text-muted-foreground">
          <span className="bg-card px-2">or sign up with email</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <AnimatedInput
            label="Full name"
            value={signupData.name}
            placeholder="John Doe"
            onChange={(value) => setSignupData((prev) => ({ ...prev, name: value }))}
            autoComplete="name"
            required
            inputClassName="h-10"
          />
        </div>

        <div className="space-y-2">
          <AnimatedInput
            label="Email"
            value={signupData.email}
            placeholder="you@example.com"
            onChange={(value) => setSignupData((prev) => ({ ...prev, email: value }))}
            type="email"
            autoComplete="email"
            required
            inputClassName="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="pr-10"
              value={signupData.password}
              onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {signupData.password ? (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-sm ${index < passwordStrength ? strengthColors[Math.max(passwordStrength - 1, 0)] : 'bg-muted'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Strength: {strengthLabels[Math.max(passwordStrength - 1, 0)] || 'Too short'}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              className="pr-10"
              value={signupData.confirmPassword}
              onChange={(event) => setSignupData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

 <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4" />
        Trial includes all core modules during onboarding.
      </div>
    </AuthShell>
  )
}
