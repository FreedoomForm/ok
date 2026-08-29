'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { SitePanel } from '@/components/site/SiteScaffold'
import { useLanguage } from '@/contexts/LanguageContext'

interface CustomerThreadMessage {
  id: string
  content: string
  author: 'CUSTOMER' | 'ADMIN'
  senderName: string | null
  createdAt: string
}

const labels = {
  ru: {
    title: 'Чат',
    description: 'Сообщения с вашим администратором в одном месте.',
    administrator: 'Администратор',
    inputLabel: 'Текст сообщения',
    send: 'Отправить',
    sending: 'Отправка...',
    empty: 'Сообщений пока нет. Напишите первым.',
    failedLoad: 'Не удалось загрузить сообщения',
    failedSend: 'Не удалось отправить сообщение',
    you: 'Вы',
  },
  uz: {
    title: 'Suhbat',
    description: 'Administratoringiz bilan xabarlar bir joyda.',
    administrator: 'Administrator',
    inputLabel: 'Xabar matni',
    send: 'Yuborish',
    sending: 'Yuborilmoqda...',
    empty: 'Hozircha xabarlar yo‘q. Birinchi bo‘lib yozing.',
    failedLoad: 'Xabarlarni yuklash muvaffaqiyatsiz',
    failedSend: 'Xabarni yuborish muvaffaqiyatsiz',
    you: 'Siz',
  },
} as const

function formatTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function CustomerChatPanel({ customerToken }: { customerToken: string | null }) {
  const { language } = useLanguage()
  const t = labels[language === 'uz' ? 'uz' : 'ru']
  const [messages, setMessages] = useState<CustomerThreadMessage[]>([])
  const [contactName, setContactName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const loadThread = useCallback(async () => {
    if (!customerToken) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/customers/chat', { headers: { Authorization: `Bearer ${customerToken}` } })
      if (!response.ok) {
        toast.error(t.failedLoad)
        return
      }
      const payload = await response.json()
      setMessages(Array.isArray(payload.messages) ? payload.messages : [])
      setContactName(payload.contact?.name ?? null)
    } catch {
      toast.error(t.failedLoad)
    } finally {
      setIsLoading(false)
    }
  }, [customerToken, t.failedLoad])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!customerToken || isSending) return
    const content = draft.trim()
    if (!content) return
    setIsSending(true)
    try {
      const response = await fetch('/api/customers/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) {
        toast.error(t.failedSend)
        return
      }
      const payload = await response.json()
      if (payload.message) {
        setMessages((previous) => [...previous, payload.message])
        setDraft('')
      }
    } catch {
      toast.error(t.failedSend)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <SitePanel className="flex h-[70svh] min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--site-border)' }}>
        <div>
          <h2 className="text-xl font-semibold">{t.title}</h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--site-muted)' }}>
            {contactName ? `${t.administrator}: ${contactName}` : t.description}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--site-muted)' }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--site-muted)' }}>{t.empty}</p>
        ) : (
          messages.map((message) => {
            const own = message.author === 'CUSTOMER'
            return (
              <div key={message.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                <div
                  className="max-w-[80%] rounded-md px-3 py-2 text-sm"
                  style={own
                    ? { backgroundColor: 'var(--site-accent)', color: '#ffffff' }
                    : { backgroundColor: 'var(--site-panel)', border: '1px solid var(--site-border)' }}
                >
                  {message.content}
                </div>
                <span className="mt-0.5 text-[10px]" style={{ color: 'var(--site-muted)' }}>
                  {own ? t.you : message.senderName ?? t.administrator} · {formatTime(message.createdAt)}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t pt-3" style={{ borderColor: 'var(--site-border)' }}>
        <label className="sr-only" htmlFor="customer-chat-input">{t.inputLabel}</label>
        <textarea
          id="customer-chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          rows={1}
          placeholder={t.inputLabel}
          className="max-h-24 min-h-[40px] w-full resize-none rounded-md border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || !draft.trim()}
          aria-label={t.send}
          title={t.send}
          className="inline-flex h-[40px] shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--site-accent)', color: '#ffffff' }}
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t.send}
        </button>
      </div>
    </SitePanel>
  )
}
