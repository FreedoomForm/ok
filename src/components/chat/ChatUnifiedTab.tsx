'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquarePlus, Pencil, Power, PowerOff, Send, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchPanel } from '@/components/ui/search-panel'
import { cn } from '@/lib/utils'
import { getJsonFromLocalStorage } from '@/lib/browser-storage'
import { CHAT_CONTACT_COLORS } from '@/lib/chat/contacts'
import { ColorSquarePalette } from '@/components/admin/dashboard/shared/ColorSquarePalette'
import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
}

type ChatContactStateFilter = 'ALL' | 'ENABLED' | 'DISABLED' | 'DELETED'

interface ChatContact {
  id: string
  adminId: string | null
  type: 'ADMIN' | 'SYSTEM'
  state: 'ENABLED' | 'DISABLED' | 'DELETED'
  name: string
  phone: string
  color: string
  icon: string
  conversationId: string | null
  unreadCount: number
  lastMessage: Conversation['lastMessage'] | null
  admin?: User | null
}

const TamboAgentWidget = dynamic(
  () => import('@/components/tambo/TamboAgentWidget').then((module) => module.TamboAgentWidget),
  { ssr: false, loading: () => null }
)
const tamboEnabled = Boolean(process.env.NEXT_PUBLIC_TAMBO_API_KEY)

const TAMBO_AI_AGENT: User = {
  id: 'tambo-ai',
  name: 'Tambo AI',
  email: '',
  role: 'AI_AGENT',
}

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
    sender: {
    id: string
    name: string
    role: string
  }
  messageType?: 'USER' | 'SYSTEM'
  systemCode?: string | null
  replyToMessageId?: string | null
}

interface Conversation {
  id: string
  otherParticipant: User
  lastMessage: {
    content: string
    createdAt: string
    isRead: boolean
    senderId: string
    messageType?: 'USER' | 'SYSTEM'
  } | null
  unreadCount: number
}

type SelectedThread =
  | { kind: 'conversation'; conversationId: string }
  | { kind: 'ai'; agent: User }
  | null

function getStoredUserId() {
  if (typeof window === 'undefined') return null
  const user = getJsonFromLocalStorage<{ id?: string }>('user')
  if (!user || typeof user.id !== 'string') return null
  return user.id
}

function openTamboWithPrompt(prompt: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('tambo:open-chat', { detail: { prompt, newThread: true } }))
}

function buildAdminAgentPrompt(agent: User) {
  // Keep this short; the Tambo system prompt already enforces tool-based responses.
  if (agent.id === TAMBO_AI_AGENT.id) {
    return (
      'You are Tambo AI: a manager assistant for operations and audits. ' +
      'Answer with practical steps, tables/filters, and period-based summaries (day/week/month).'
    )
  }
  return (
    `Act as an AI agent representing admin "${agent.name}" (${agent.role}). ` +
    'Focus on operations, audit periods (day/week/month), and manager-friendly explanations. ' +
    'Be concise and propose tables/filters when helpful.'
  )
}

interface ChatUnifiedTabProps {
  initialShowUserList?: boolean
  autoSmsEnabled?: boolean
  onContactSelectionChange?: (ids: readonly string[]) => void
  universalCreate?: boolean
  onUniversalCreateHandled?: () => void
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

type ChatUiText = {
  common?: {
    ai?: string
    couldNotLoadMessages?: string
    couldNotSendMessage?: string
    couldNotStartConversation?: string
    loading?: string
  }
  roles?: {
    courier?: string
    lowAdmin?: string
    middleAdmin?: string
    superAdmin?: string
  }
  chat?: {
    aiHint?: string
    newConversation?: string
    noConversations?: string
    noMessagesYet?: string
    noUsers?: string
    searchConversations?: string
    searchUsers?: string
    selectConversation?: string
    selectConversationHint?: string
    subtitle?: string
    title?: string
    writeMessage?: string
  }
}

export function ChatUnifiedTab({ initialShowUserList = false, autoSmsEnabled = false, onContactSelectionChange, universalCreate = false, onUniversalCreateHandled, universalEdit = false, onUniversalEditHandled }: ChatUnifiedTabProps) {
  const { t, language } = useLanguage()
  const ui: ChatUiText = t
  const chatLabels = language === 'uz'
    ? { createContact: 'Kontakt yaratish', name: 'Ism', phone: 'Telefon', create: 'Yaratish', cancel: 'Bekor qilish', color: 'Rang', contactCreated: 'Kontakt yaratildi', searchUsers: 'Foydalanuvchilarni qidirish', searchConversations: 'Suhbatlarni qidirish', loading: 'Yuklanmoqda...', noUsers: 'Foydalanuvchilar yo‘q.', aiHint: 'Tambo orqali AI agent', noMessages: 'Hali xabarlar yo‘q.', disabled: "O'chirilgan", noConversations: 'Hali suhbatlar yo‘q.', selectPeople: 'Odamlarni tanlash', system: 'Tizim', disabledContact: "Kontakt o'chirilgan", writeMessage: 'Xabar yozing...',     selectConversation: 'Suhbatni tanlang', selectHint: 'Xabar yuborish uchun suhbatni tanlang.', loadOlder: 'Eski xabarlar', reply: 'Javob berish' }
    : { createContact: 'Создать контакт', name: 'Имя', phone: 'Телефон', create: 'Создать', cancel: 'Отмена', color: 'Цвет', contactCreated: 'Контакт создан', searchUsers: 'Поиск пользователей', searchConversations: 'Поиск бесед', loading: 'Загрузка...', noUsers: 'Нет доступных пользователей.', aiHint: 'AI-агент через Tambo', noMessages: 'Сообщений пока нет.', disabled: 'Отключен', noConversations: 'Бесед пока нет.', selectPeople: 'Выбрать людей', system: 'Система', disabledContact: 'Контакт отключен', writeMessage: 'Напишите сообщение...', selectConversation: 'Выберите беседу', selectHint: 'Выберите беседу, чтобы отправить сообщение.', loadOlder: 'Старые сообщения', reply: 'Ответить' }


  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [contactStateFilter, setContactStateFilter] = useState<ChatContactStateFilter>('ALL')
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())
  const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false)
  const [batchMessage, setBatchMessage] = useState('')
  const [isBatchSending, setIsBatchSending] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedThread, setSelectedThread] = useState<SelectedThread>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactDraftName, setContactDraftName] = useState('')
  const [isContactActionLoading, setIsContactActionLoading] = useState(false)
  const [isContactCreateOpen, setIsContactCreateOpen] = useState(false)

  useEffect(() => {
    if (!universalCreate) return
    setIsContactCreateOpen(true)
    onUniversalCreateHandled?.()
  }, [onUniversalCreateHandled, universalCreate])

  useEffect(() => {
    if (!universalEdit) return
    if (selectedRecipientIds.size > 1) setIsSelectedElementsOpen(true)
    onUniversalEditHandled?.()
  }, [onUniversalEditHandled, selectedRecipientIds.size, universalEdit])
  const [contactCreateName, setContactCreateName] = useState('')
  const [contactCreatePhone, setContactCreatePhone] = useState('')
  const [contactCreateColor, setContactCreateColor] = useState<string>(CHAT_CONTACT_COLORS[0])
  const [showUserList, setShowUserList] = useState(initialShowUserList)
  const [isNarrowView, setIsNarrowView] = useState(false)
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list')
  const [isBootLoading, setIsBootLoading] = useState(true)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentUserId = useMemo(() => getStoredUserId(), [])

  const selectedConversationId =
    selectedThread?.kind === 'conversation' ? selectedThread.conversationId : null
  const selectedAiAgent = selectedThread?.kind === 'ai' ? selectedThread.agent : null

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(max-width: 1279px)') // < xl
    const apply = () => setIsNarrowView(media.matches)
    apply()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }

    // Safari fallback
    media.addListener(apply)
    return () => media.removeListener(apply)
  }, [])

  useEffect(() => {
    if (!isNarrowView) return
    setMobilePane(selectedThread ? 'chat' : 'list')
  }, [isNarrowView, selectedThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(
      (conversation) =>
        conversation.otherParticipant.name.toLowerCase().includes(query) ||
        conversation.otherParticipant.email.toLowerCase().includes(query)
    )
  }, [conversations, search])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return availableUsers
    return availableUsers.filter(
      (user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    )
  }, [availableUsers, search])

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contacts.filter((contact) => {
      const stateMatches = contactStateFilter === 'ALL' || contact.state === contactStateFilter
      const queryMatches = !query || contact.name.toLowerCase().includes(query) || contact.phone.toLowerCase().includes(query)
      return stateMatches && queryMatches
    })
  }, [contactStateFilter, contacts, search])

  const selectedConversationData = useMemo(() => {
    if (!selectedConversationId) return null
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null
  }, [conversations, selectedConversationId])

  const selectedContact = useMemo(() => {
    if (!selectedConversationId) return null
    return contacts.find((contact) => contact.conversationId === selectedConversationId) ?? null
  }, [contacts, selectedConversationId])

  const selectedSystemConversation = selectedContact?.type === 'SYSTEM'
  const selectedContactDisabled = selectedContact?.state === 'DISABLED'
  const activeReplyTarget = replyToMessageId ? messages.find((message) => message.id === replyToMessageId) ?? null : null

  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch {
      // ignore transient polling errors
    }
  }, [])

  const fetchContacts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setContacts(Array.isArray(data?.contacts) ? data.contacts : [])
      }
    } catch {
      // The legacy conversation list remains usable if contact metadata is unavailable.
    }
  }, [])

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/users', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        const users = Array.isArray(data?.users) ? data.users : []
        // Add Tambo AI as a first-class "admin-like" agent in the list (no separate AI button per user).
        setAvailableUsers([TAMBO_AI_AGENT, ...users])
      }
    } catch {
      // ignore transient loading errors
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: string, silent = false) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Unable to fetch messages')
      }

      const data = await response.json()
      setMessages(Array.isArray(data?.messages) ? data.messages : [])
      setHistoryCursor(typeof data?.nextBefore === 'string' ? data.nextBefore : null)
      setHasOlderMessages(data?.hasMore === true)

      await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      })
    } catch {
      if (!silent) toast.error(ui?.common?.couldNotLoadMessages ?? (language === 'uz' ? 'Xabarlar yuklanmadi' : 'Сообщения не загружены'))
    }
  }, [language, ui?.common?.couldNotLoadMessages])

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversationId || !historyCursor || !hasOlderMessages || isLoadingOlderMessages) return
    setIsLoadingOlderMessages(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(selectedConversationId)}&before=${encodeURIComponent(historyCursor)}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('Unable to fetch older messages')
      const older = Array.isArray(data?.messages) ? data.messages : []
      setMessages((current) => [...older, ...current])
      setHistoryCursor(typeof data?.nextBefore === 'string' ? data.nextBefore : null)
      setHasOlderMessages(data?.hasMore === true)
    } catch {
      toast.error(language === 'uz' ? 'Eski xabarlar yuklanmadi' : 'Старые сообщения не загружены')
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }, [hasOlderMessages, historyCursor, isLoadingOlderMessages, language, selectedConversationId])

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true)
      await Promise.all([fetchConversations(), fetchContacts(), fetchAvailableUsers()])
      setIsBootLoading(false)
    }

    void load()
  }, [fetchConversations, fetchContacts, fetchAvailableUsers, fetchMessages, selectedConversationId])

  async function startConversation(userId: string) {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId: userId }),
      })

      if (!response.ok) {
        throw new Error('Could not start conversation')
      }

      const data = await response.json()
      setSelectedThread({ kind: 'conversation', conversationId: data.conversation.id })
      setShowUserList(false)
      setMobilePane('chat')
      await fetchConversations()
      await fetchContacts()
      await fetchMessages(data.conversation.id)
    } catch {
      toast.error(ui?.common?.couldNotStartConversation ?? (language === 'uz' ? 'Suhbat boshlanmadi' : 'Не удалось начать беседу'))
    }
  }

  async function createContact() {
    if (!contactCreateName.trim() || !contactCreatePhone.trim() || isContactActionLoading) return
    setIsContactActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/contacts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactCreateName.trim(), phone: contactCreatePhone.trim(), color: contactCreateColor, icon: 'user-check' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Не удалось создать контакт')
      if (data?.contact) setContacts((previous) => [data.contact as ChatContact, ...previous])
      setContactCreateName('')
      setContactCreatePhone('')
      setIsContactCreateOpen(false)
      toast.success(chatLabels.contactCreated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать контакт')
    } finally {
      setIsContactActionLoading(false)
    }
  }

  async function updateContact(patch: { id: string; name?: string; state?: ChatContact['state'] }) {
    setIsContactActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/contacts', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('Could not update contact')
      const data = await response.json()
      if (data?.contact) setContacts((previous) => previous.map((contact) => contact.id === data.contact.id ? { ...contact, ...data.contact } : contact))
      setEditingContactId(null)
    } catch {
      toast.error('Could not update contact')
    } finally {
      setIsContactActionLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversationId || selectedSystemConversation || selectedContactDisabled) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          content: newMessage.trim(),
          replyToMessageId: replyToMessageId ?? undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Could not send message')
      }

      setNewMessage('')
      setReplyToMessageId(null)
      await fetchMessages(selectedConversationId)
      await fetchConversations()
    } catch {
      toast.error(ui?.common?.couldNotSendMessage ?? 'Не удалось отправить сообщение')
    }
  }

  function toggleRecipient(contact: ChatContact) {
    if (contact.type === 'SYSTEM' || !contact.adminId || (contact.state === 'DISABLED' && !autoSmsEnabled)) return
    const next = new Set(selectedRecipientIds)
    if (next.has(contact.id)) next.delete(contact.id)
    else next.add(contact.id)
    setSelectedRecipientIds(next)
    onContactSelectionChange?.([...next])
  }

  async function sendBatchMessage() {
    const content = batchMessage.trim()
    const selectedContacts = filteredContacts.filter((contact) => selectedRecipientIds.has(contact.id) && contact.adminId && contact.type !== 'SYSTEM')
    const recipients = selectedContacts.filter((contact) => contact.state !== 'DISABLED')
    if (!content || (autoSmsEnabled ? selectedContacts.length === 0 : recipients.length === 0) || isBatchSending) return
    setIsBatchSending(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    let sent = 0
    let skipped = 0
    try {
      if (autoSmsEnabled) {
        const response = await fetch('/api/chat/auto-sms', { method: 'POST', headers, body: JSON.stringify({ contactIds: selectedContacts.map((contact) => contact.id), content }) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : (language === 'uz' ? 'Avto-xabar yuborilmadi' : 'Авто-сообщение не отправлено'))
        sent = typeof data?.sent === 'number' ? data.sent : 0
        skipped = typeof data?.skipped === 'number' ? data.skipped : 0
      } else {
        for (const recipient of recipients) {
          const conversationResponse = await fetch('/api/chat/conversations', {
            method: 'POST',
            headers,
            body: JSON.stringify({ participantId: recipient.adminId }),
          })
          const conversationData = await conversationResponse.json().catch(() => ({}))
          const conversationId = conversationData?.conversation?.id
          if (!conversationResponse.ok || typeof conversationId !== 'string') continue
          const messageResponse = await fetch('/api/chat/send', {
            method: 'POST',
            headers,
            body: JSON.stringify({ conversationId, content }),
          })
          if (messageResponse.ok) sent += 1
        }
      }
      if (sent > 0 || (autoSmsEnabled && skipped > 0)) {
        setBatchMessage('')
        setSelectedRecipientIds(new Set())
        onContactSelectionChange?.([])
        await fetchConversations()
        toast.success(autoSmsEnabled
          ? language === 'uz' ? `${sent} ta yuborildi, ${skipped} ta o'tkazib yuborildi` : `${sent} отправлено, ${skipped} пропущено`
          : language === 'uz' ? `${sent} ta kontaktga xabar yuborildi` : `${sent} контактам отправлено сообщение`)
      } else {
        toast.error(language === 'uz' ? 'Xabar yuborilmadi' : 'Сообщение не отправлено')
      }
    } finally {
      setIsBatchSending(false)
    }
  }

  function selectConversation(conversationId: string) {
    setSelectedThread({ kind: 'conversation', conversationId })
    setShowUserList(false)
    setMobilePane('chat')
    void fetchMessages(conversationId)
  }

  function selectContact(contact: ChatContact) {
    if (contact.conversationId) {
      selectConversation(contact.conversationId)
      return
    }
    if (contact.adminId) {
      void startConversation(contact.adminId)
    }
  }

  function selectAiAgent(agent: User) {
    setSelectedThread({ kind: 'ai', agent })
    setShowUserList(false)
    setMobilePane('chat')
    openTamboWithPrompt(buildAdminAgentPrompt(agent))
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'AI_AGENT':
        return 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100'
      case 'SUPER_ADMIN':
        return 'bg-violet-100 text-violet-800'
      case 'MIDDLE_ADMIN':
        return 'bg-sky-100 text-sky-800'
      case 'LOW_ADMIN':
        return 'bg-emerald-100 text-emerald-800'
      case 'COURIER':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'AI_AGENT':
        return ui?.common?.ai ?? 'AI'
      case 'SUPER_ADMIN':
        return ui?.roles?.superAdmin ?? 'Супер-администратор'
      case 'MIDDLE_ADMIN':
        return ui?.roles?.middleAdmin ?? 'Старший администратор'
      case 'LOW_ADMIN':
        return ui?.roles?.lowAdmin ?? 'Младший администратор'
      case 'COURIER':
        return ui?.roles?.courier ?? 'Курьер'
      default:
        return role
    }
  }

  const aiConversationLabel = selectedAiAgent ? `${selectedAiAgent.name} (AI)` : null

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_1fr]">
      {!isNarrowView || mobilePane === 'list' ? (
        <Card className="min-h-0 overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">
                {ui?.chat?.title ?? 'Чат'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {ui?.chat?.subtitle ?? 'Командный чат и AI-помощники в одном месте.'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                aria-label={chatLabels.createContact}
                title={chatLabels.createContact}
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-lg border border-primary/30 text-primary shadow-none active:scale-[.95]"
                onClick={() => setIsContactCreateOpen((previous) => !previous)}
              >
                <MessageSquarePlus className="size-6" />
              </Button>
              <Button
                aria-label="New conversation"
                title="New conversation"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-lg border border-input shadow-none active:scale-[.95]"
                onClick={() => {
                  setShowUserList((prev) => !prev)
                  setMobilePane('list')
                }}
              >
                <Users className="size-5" />
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-2 flex gap-1 overflow-x-auto" aria-label={language === 'uz' ? 'Kontakt holati' : 'Состояние контактов'}>
              {(['ALL', 'ENABLED', 'DISABLED', 'DELETED'] as const).map((state) => {
                const label = state === 'ALL' ? (language === 'uz' ? 'Barchasi' : 'Все') : state === 'ENABLED' ? (language === 'uz' ? 'Yoqilgan' : 'Включены') : state === 'DISABLED' ? (language === 'uz' ? "O'chirilgan" : 'Отключены') : (language === 'uz' ? 'Savat' : 'Корзина')
                return <Button key={state} type="button" variant={contactStateFilter === state ? 'secondary' : 'ghost'} size="sm" className="h-8 shrink-0 rounded-sm px-2 text-[11px]" onClick={() => setContactStateFilter(state)}>{label}</Button>
              })}
            </div>
            <SearchPanel
              value={search}
              onChange={setSearch}
              placeholder={
                showUserList
                  ? ui?.chat?.searchUsers ?? chatLabels.searchUsers
                  : ui?.chat?.searchConversations ?? chatLabels.searchConversations
              }
              className="max-w-none"
            />
          </div>
          {selectedRecipientIds.size > 0 ? (
            <div className="mt-3 space-y-2 border-t border-border/40 pt-3" aria-label={language === 'uz' ? 'Tanlangan kontaktlarga xabar' : 'Сообщение выбранным контактам'}>
              {autoSmsEnabled ? <div role="status" className="text-xs text-primary">{language === 'uz' ? 'Ichki avto-xabar rejimi' : 'Режим внутренних авто-сообщений'}</div> : null}
              <Input value={batchMessage} onChange={(event) => setBatchMessage(event.target.value)} placeholder={language === 'uz' ? 'Xabar matni' : 'Текст сообщения'} aria-label={language === 'uz' ? 'Xabar matni' : 'Текст сообщения'} />
              <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">{selectedRecipientIds.size}</span><Button type="button" disabled={isBatchSending || !batchMessage.trim()} onClick={() => void sendBatchMessage()}>{isBatchSending ? '...' : language === 'uz' ? 'Yuborish' : 'Отправить'}</Button></div>
            </div>
          ) : null}
          {isContactCreateOpen ? (
            <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={contactCreateName} onChange={(event) => setContactCreateName(event.target.value)} placeholder={chatLabels.name} aria-label={chatLabels.name} />
                <Input value={contactCreatePhone} onChange={(event) => setContactCreatePhone(event.target.value)} placeholder={chatLabels.phone} aria-label={chatLabels.phone} inputMode="tel" />
              </div>
              <ColorSquarePalette value={contactCreateColor} onChange={setContactCreateColor} label={chatLabels.color} colors={CHAT_CONTACT_COLORS} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsContactCreateOpen(false)}>{chatLabels.cancel}</Button>
                <Button type="button" disabled={isContactActionLoading || !contactCreateName.trim() || !contactCreatePhone.trim()} onClick={() => void createContact()}>{chatLabels.create}</Button>
              </div>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {isBootLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-sm text-muted-foreground">{ui?.common?.loading ?? chatLabels.loading}</div>
            </div>
          ) : isSelectedElementsOpen ? (
            <div data-reference-selected-elements="chat" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{language === 'uz' ? 'Tanlangan kontaktlar' : 'Выбранные контакты'}</h2><Button type="button" variant="ghost" size="sm" onClick={() => setIsSelectedElementsOpen(false)}>{language === 'uz' ? 'Orqaga' : 'Назад'}</Button></div>
              <div className="divide-y border-y" role="list" aria-label={language === 'uz' ? 'Tanlangan kontaktlar' : 'Выбранные контакты'}>{contacts.filter((contact) => selectedRecipientIds.has(contact.id)).map((contact) => <button key={contact.id} type="button" role="listitem" className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => { setIsSelectedElementsOpen(false); selectContact(contact) }}><span className="truncate text-sm font-medium">{contact.name}</span><span className="shrink-0 text-xs text-muted-foreground">{language === 'uz' ? 'Ochish' : 'Открыть'}</span></button>)}</div>
            </div>
          ) : showUserList ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {ui?.chat?.noUsers ?? chatLabels.noUsers}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left"
                  >
                    <Button
                      type="button"
                      onClick={() => (user.id === TAMBO_AI_AGENT.id ? selectAiAgent(user) : void startConversation(user.id))}
                      variant="ghost"
                      className="flex min-w-0 flex-1 items-center gap-3 justify-start text-left hover:text-foreground"
                    >
                      <Avatar>
                        <AvatarFallback>{user.id === TAMBO_AI_AGENT.id ? 'AI' : user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.id === TAMBO_AI_AGENT.id ? (ui?.chat?.aiHint ?? chatLabels.aiHint) : user.email}
                        </div>
                      </div>
                      <Badge className={cn(getRoleColor(user.role), 'shrink-0 max-w-[140px] truncate')}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {aiConversationLabel ? (
                <Button
                  type="button"
                  onClick={() => selectAiAgent(selectedAiAgent!)}
                  variant="ghost"
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 justify-start text-left hover:bg-muted/40',
                    selectedThread?.kind === 'ai' ? 'bg-muted/50' : ''
                  )}
                >
                  <Avatar>
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{aiConversationLabel}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {ui?.chat?.aiHint ?? chatLabels.aiHint}
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100">
                    {ui?.common?.ai ?? 'AI'}
                  </Badge>
                </Button>
              ) : null}

              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <Button
                    key={contact.id}
                    type="button"
                    onClick={() => selectContact(contact)}
                    variant="ghost"
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 justify-start text-left hover:bg-muted/40',
                      contact.conversationId && selectedConversationId === contact.conversationId ? 'bg-muted/50' : '',
                      contact.state === 'DISABLED' ? 'opacity-60' : '',
                    )}
                  >
                    <input type="checkbox" checked={selectedRecipientIds.has(contact.id)} disabled={contact.type === 'SYSTEM' || !contact.adminId || (contact.state === 'DISABLED' && !autoSmsEnabled)} onClick={(event) => event.stopPropagation()} onChange={() => toggleRecipient(contact)} aria-label={`${language === 'uz' ? 'Tanlash' : 'Выбрать'} ${contact.name}`} className="size-4 shrink-0 accent-primary" />
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: contact.color, color: '#fff' }}>
                        {contact.type === 'SYSTEM' ? 'S' : contact.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{contact.name}</span>
                        {contact.unreadCount > 0 ? (
                          <Badge className="bg-rose-500 text-white">{contact.unreadCount}</Badge>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {contact.lastMessage?.content || (contact.state === 'DISABLED' ? chatLabels.disabled : ui?.chat?.noMessagesYet ?? chatLabels.noMessages)}
                      </div>
                    </div>
                  </Button>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {ui?.chat?.noConversations ?? chatLabels.noConversations}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    variant="ghost"
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 justify-start text-left hover:bg-muted/40',
                      selectedConversationId === conversation.id ? 'bg-muted/50' : ''
                    )}
                  >
                    <Avatar>
                      <AvatarFallback>{conversation.otherParticipant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{conversation.otherParticipant.name}</span>
                        {conversation.unreadCount > 0 ? (
                          <Badge className="bg-rose-500 text-white">{conversation.unreadCount}</Badge>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {conversation.lastMessage?.content || (ui?.chat?.noMessagesYet ?? 'Сообщений пока нет.')}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {!isNarrowView || mobilePane === 'chat' ? (
        <Card
          className={cn(
            'min-h-0 overflow-hidden',
            selectedAiAgent ? 'gap-0 py-0' : ''
          )}
        >
        {selectedAiAgent ? (
          <>
            {isNarrowView ? (
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{aiConversationLabel}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{ui?.chat?.aiHint ?? chatLabels.aiHint}</p>
                  </div>
                  <Button
                    aria-label={ui?.chat?.newConversation ?? chatLabels.selectPeople}
                    title={ui?.chat?.newConversation ?? chatLabels.selectPeople}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setShowUserList(true)
                      setMobilePane('list')
                    }}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            ) : null}
            <CardContent className="h-full min-h-0 px-0">
              {tamboEnabled ? <TamboAgentWidget embedded /> : null}
            </CardContent>
          </>
        ) : selectedConversationId ? (
          <>
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarFallback style={selectedContact ? { backgroundColor: selectedContact.color, color: '#fff' } : undefined}>
                      {selectedContact?.type === 'SYSTEM' ? 'S' : selectedContact?.name?.[0] || selectedConversationData?.otherParticipant.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{selectedContact?.name || selectedConversationData?.otherParticipant.name}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">
                      {selectedContact?.type === 'SYSTEM' ? 'AutoFood' : selectedContact?.phone || selectedConversationData?.otherParticipant.email}
                    </p>
                  </div>
                </div>

                {selectedContact && !selectedSystemConversation ? (
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" title={language === 'uz' ? 'Kontaktni tahrirlash' : 'Изменить контакт'} aria-label={language === 'uz' ? 'Kontaktni tahrirlash' : 'Изменить контакт'} onClick={() => { setEditingContactId(selectedContact.id); setContactDraftName(selectedContact.name) }}><Pencil className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" title={language === 'uz' ? 'Kontaktni yoqish' : 'Включить контакт'} aria-label={language === 'uz' ? 'Kontaktni yoqish' : 'Включить контакт'} disabled={isContactActionLoading || selectedContact.state === 'ENABLED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'ENABLED' })}><Power className="size-4 text-emerald-600" /></Button>
                    <Button type="button" variant="ghost" size="icon" title={language === 'uz' ? "Kontaktni o'chirish" : 'Отключить контакт'} aria-label={language === 'uz' ? "Kontaktni o'chirish" : 'Отключить контакт'} disabled={isContactActionLoading || selectedContact.state === 'DISABLED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'DISABLED' })}><PowerOff className="size-4 text-amber-600" /></Button>
                    <Button type="button" variant="ghost" size="icon" title={language === 'uz' ? 'Kontaktni savatga yuborish' : 'Переместить контакт в корзину'} aria-label={language === 'uz' ? 'Kontaktni savatga yuborish' : 'Переместить контакт в корзину'} disabled={isContactActionLoading || selectedContact.state === 'DELETED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'DELETED' })}><Trash2 className="size-4 text-red-600" /></Button>
                  </div>
                ) : null}

                {isNarrowView ? (
                  <Button
                    aria-label={ui?.chat?.newConversation ?? chatLabels.selectPeople}
                    title={ui?.chat?.newConversation ?? chatLabels.selectPeople}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setShowUserList(true)
                      setMobilePane('list')
                    }}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="flex h-full min-h-0 flex-col gap-3 p-4">
              {selectedContact && !selectedSystemConversation ? (
                <div data-reference-chat-contact-calendar>
                  <ResourceCalendarPanel resourceType="CHAT_CONTACT" resourceId={selectedContact.id} days={3} compact />
                </div>
              ) : null}
              {editingContactId === selectedContact?.id ? (
                <div className="mb-3 flex gap-2 border-b border-border/60 pb-3">
                  <Input value={contactDraftName} onChange={(event) => setContactDraftName(event.target.value)} aria-label={chatLabels.name} />
                  <Button type="button" disabled={isContactActionLoading || !contactDraftName.trim()} onClick={() => void updateContact({ id: editingContactId, name: contactDraftName.trim() })}>{language === 'uz' ? 'Saqlash' : 'Сохранить'}</Button>
                  <Button type="button" variant="outline" onClick={() => setEditingContactId(null)}>{chatLabels.cancel}</Button>
                </div>
              ) : null}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {hasOlderMessages ? <button type="button" className="mx-auto block text-xs text-muted-foreground underline disabled:opacity-50" onClick={() => void loadOlderMessages()} disabled={isLoadingOlderMessages}>{isLoadingOlderMessages ? chatLabels.loading : chatLabels.loadOlder}</button> : null}
                {messages.map((message) => {
                  const replyTarget = message.replyToMessageId ? messages.find((candidate) => candidate.id === message.replyToMessageId) : null
                  if (message.messageType === 'SYSTEM') {
                    return (
                      <div key={message.id} className="flex justify-center px-4 py-2">
                        <div className="max-w-[78%] rounded-full border border-border bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
                          {message.content}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', message.senderId === currentUserId ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-4 py-3',
                          message.senderId === currentUserId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        {replyTarget ? <button type="button" className="mb-2 block w-full border-l-2 border-current/40 pl-2 text-left text-xs opacity-80" aria-label={`${chatLabels.reply}: ${replyTarget.content}`} onClick={() => setReplyToMessageId(replyTarget.id)}>{replyTarget.content}</button> : null}
                        <div className="text-sm leading-6">{message.content}</div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          </div>
                          <button type="button" className="mt-1 text-[11px] underline opacity-80" aria-label={chatLabels.reply} onClick={() => setReplyToMessageId(message.id)}>{chatLabels.reply}</button>
                        </div>
                      </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {activeReplyTarget ? <div className="mb-2 flex items-center gap-2 border-l-2 border-primary pl-2 text-xs text-muted-foreground"><span className="min-w-0 flex-1 truncate">{activeReplyTarget.content}</span><Button type="button" variant="ghost" size="sm" className="h-6 px-1" aria-label={`${chatLabels.cancel}: ${chatLabels.reply}`} onClick={() => setReplyToMessageId(null)}>×</Button></div> : null}
              <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
                <Input
                  value={newMessage}
                  disabled={selectedSystemConversation || selectedContactDisabled}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={selectedSystemConversation ? chatLabels.system : selectedContactDisabled ? chatLabels.disabledContact : ui?.chat?.writeMessage ?? chatLabels.writeMessage}
                  className="flex-1"
                />
                <Button aria-label={language === 'uz' ? 'Yuborish' : 'Отправить'} onClick={() => void sendMessage()} disabled={!newMessage.trim() || selectedSystemConversation || selectedContactDisabled} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full min-h-[640px] items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">{ui?.chat?.selectConversation ?? chatLabels.selectConversation}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {ui?.chat?.selectConversationHint ??
                  language === 'uz' ? 'Suhbatni tanlang yoki yangi suhbat boshlang.' : 'Выберите беседу или начните новую.'}
              </p>
              {isNarrowView ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setShowUserList(true)
                    setMobilePane('list')
                  }}
                >
                  {ui?.chat?.newConversation ?? chatLabels.selectPeople}
                </Button>
              ) : null}
            </div>
          </CardContent>
        )}
      </Card>
      ) : null}
    </div>
  )
}
