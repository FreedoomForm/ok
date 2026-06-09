'use client'

import { useMemo, useState } from 'react'
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SitePanel } from '@/components/site/SiteScaffold'
import { makeClientSiteHref } from '@/lib/site-urls'

function normalizePhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1).replace(/\D/g, '') : trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `+${digits}`
}

export function OtpAuthForm({
  subdomain,
  purpose,
  title,
  description,
}: {
  subdomain: string
  purpose: 'login' | 'register'
  title: string
  description: string
}) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])

  const sendCode = async () => {
    if (!normalizedPhone) {
      toast.error('Enter a valid phone number')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/sites/${subdomain}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          purpose,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send code')
      }

      if (data?.debugCode) {
        toast.info(`Debug OTP code: ${data.debugCode}`)
      }

      setCodeSent(true)
      toast.success('Verification code sent')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to send code')
    } finally {
      setIsSending(false)
    }
  }

  const verifyCode = async () => {
    if (!normalizedPhone) {
      toast.error('Enter a valid phone number')
      return
    }

    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter a 6-digit code')
      return
    }

    setIsVerifying(true)

    try {
      const response = await fetch(`/api/sites/${subdomain}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          code,
          purpose,
          name: name.trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Verification failed')
      }

      localStorage.setItem('customerToken', data.token)
      localStorage.setItem('customerInfo', JSON.stringify(data.customer))

      toast.success(purpose === 'register' ? 'Registration completed' : 'Login successful')
      router.push(makeClientSiteHref(subdomain, '/client'))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <SitePanel className="mx-auto w-full max-w-lg space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {purpose === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="name">Name (optional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={sendCode} disabled={isSending || !normalizedPhone} className="gap-2">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          Send code
        </Button>

        <span className="self-center text-xs text-muted-foreground">
          Free SMS API can be configured via env vars (`SMS_PROVIDER`).
        </span>
      </div>

      {codeSent && (
        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />

          <Button type="button" onClick={verifyCode} disabled={isVerifying || code.length !== 6} className="gap-2">
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {purpose === 'register' ? 'Register with phone' : 'Login with phone'}
          </Button>
        </div>
      )}
    </SitePanel>
  )
}
