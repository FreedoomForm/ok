'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ThreadMessage {
  id: string
  content: string
  author: 'CUSTOMER' | 'ADMIN'
  senderName: string | null
  createdAt: string
}

export interface CustomerChatThreadDialogLabels {
  title: string
  administrator: string
  customer: string
  inputLabel: string
  send: string
  empty: string
  you: string
  failedLoad: string
  failedSend: string
}

export function CustomerChatThreadDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
  labels,
}: {
  customerId: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  labels: CustomerChatThreadDialogLabels
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const loadThread = useCallback(async () => {
    if (!open || !customerId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/customers/chat?customerId=${encodeURIComponent(customerId)}`)
      if (!response.ok) {
        toast.error(labels.failedLoad)
        return
      }
      const payload = await response.json()
      setMessages(Array.isArray(payload.messages) ? payload.messages : [])
    } catch {
      toast.error(labels.failedLoad)
    } finally {
      setIsLoading(false)
    }
  }, [customerId, open, labels.failedLoad])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, isLoading])

  const handleSend = async () => {
    if (isSending) return
    const content = draft.trim()
    if (!content) return
    setIsSending(true)
    try {
      const response = await fetch('/api/admin/customers/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, content }),
      })
      if (!response.ok) {
        toast.error(labels.failedSend)
        return
      }
      const payload = await response.json()
      if (payload.message) {
        setMessages((previous) => [...previous, payload.message])
        setDraft('')
      }
    } catch {
      toast.error(labels.failedSend)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80svh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.title}: {customerName}</DialogTitle>
          <DialogDescription>{labels.administrator}</DialogDescription>
        </DialogHeader>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            messages.map((message) => {
              const own = message.author === 'ADMIN'
              return (
                <div key={message.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${own ? 'bg-primary text-primary-foreground' : 'border bg-muted'}`}
                  >
                    {message.content}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {own ? labels.you : labels.customer} · {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <div className="flex items-end gap-2 border-t pt-3">
          <label className="sr-only" htmlFor="customer-thread-input">{labels.inputLabel}</label>
          <textarea
            id="customer-thread-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            rows={1}
            placeholder={labels.inputLabel}
            className="max-h-24 min-h-[40px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />
          <Button type="button" size="sm" className="h-[40px]" disabled={isSending || !draft.trim()} onClick={() => void handleSend()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {labels.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
