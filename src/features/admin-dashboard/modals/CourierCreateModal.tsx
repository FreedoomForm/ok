'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { DEFAULT_COURIER_FORM, type CourierFormData } from '@/features/admin-dashboard/model'

interface CourierCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  t: any
}

export function CourierCreateModal({ open, onOpenChange, onCreated, t }: CourierCreateModalProps) {
  const [formData, setFormData] = useState<CourierFormData>({ ...DEFAULT_COURIER_FORM })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'COURIER' }),
      })

      const json = await response.json()

      if (response.ok) {
        onOpenChange(false)
        setFormData({ name: '', email: '', password: '', salary: '' })
        onCreated()
        toast.success(t.admin.toasts.courierCreated)
      } else {
        const errMsg =
          typeof json?.error === 'object'
            ? json.error?.message || t.admin.toasts.errorCreatingCourier
            : json.error || t.admin.toasts.errorCreatingCourier
        setError(errMsg)
      }
    } catch {
      setError(t.admin.toasts.serverConnectionError)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.admin.createCourier}</DialogTitle>
          <DialogDescription>
            {(t.admin as unknown as Record<string, string>).createCourierDescription ?? ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="courierName" className="text-right">
                {(t.admin as unknown as Record<string, string>).name ?? 'Name'}
              </Label>
              <Input
                id="courierName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="courierEmail" className="text-right">
                Email
              </Label>
              <Input
                id="courierEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="courierPassword" className="text-right">
                {(t.admin as unknown as Record<string, string>).password ?? 'Password'}
              </Label>
              <Input
                id="courierPassword"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
          </div>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating
                ? (t.admin as unknown as Record<string, string>).creating ?? 'Creating...'
                : t.admin.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
