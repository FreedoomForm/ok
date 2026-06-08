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
      toast.error('Enter a valid phone number')
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
        throw new Error(data?.error || 'Login failed')
      }

      localStorage.setItem('customerToken', data.token)
      localStorage.setItem('customerInfo', JSON.stringify(data.customer))
      toast.success('Login successful')
      router.replace(makeClientSiteHref(params.subdomain, '/client'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
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
          <p className="text-lg font-medium">Site not found</p>
        </div>
      </div>
    )
  }

  return (
    <SiteAuthShell
      site={site}
      subdomain={params.subdomain}
      badge="Client access"
      title="Login with your phone number"
      description="Use the phone number connected to your account to open your dashboard, track active deliveries, and update your location."
      features={[
        {
          icon: Smartphone,
          title: 'Phone-first login',
          description: 'Fast sign-in without password complexity.',
        },
        {
          icon: ArrowRight,
          title: 'Direct to dashboard',
          description: 'After login you immediately see balance, orders, and menu.',
        },
      ]}
      formTitle="Login"
      formDescription="Enter your phone in international format."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+998901234567"
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !normalizedPhone} className="w-full gap-2 rounded-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Login
        </Button>
      </form>

 <div className="mt-4 rounded-xl bg-emerald-300/10 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4" />
          Quick secure access
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Your session is tied to this device token and can be revoked by logging out.
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        New client?{' '}
        <Link href={makeClientSiteHref(params.subdomain, '/register')} className="font-medium underline">
          Create account
        </Link>
      </p>
    </SiteAuthShell>
  )
}
