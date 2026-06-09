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
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!normalizedPhone) {
      toast.error('Enter a valid phone number')
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
        throw new Error(data?.error || 'Registration failed')
      }

      toast.success('Registered. Now login with your phone number.')
      router.replace(makeClientSiteHref(params.subdomain, '/login'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
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
      badge="Client registration"
      title="Create your portal access"
      description="Register once with phone number and start using your client portal for balance tracking, menu viewing, and delivery updates."
      features={[
        {
          icon: NotebookTabs,
          title: 'Simple onboarding',
          description: 'Name is optional, phone is your core account key.',
        },
        {
          icon: ArrowRight,
          title: 'Next step ready',
          description: 'After registration you can login immediately with the same phone.',
        },
      ]}
      formTitle="Register"
      formDescription="Registration and login are both handled with phone number."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name (optional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex"
          />
        </div>

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
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Register
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link href={makeClientSiteHref(params.subdomain, '/login')} className="font-medium underline">
          Login
        </Link>
      </p>
    </SiteAuthShell>
  )
}
