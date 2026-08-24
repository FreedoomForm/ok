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
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
}

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

export function ChatUnifiedTab({ initialShowUserList = false }: ChatUnifiedTabProps) {
  const { t } = useLanguage()
  const ui: ChatUiText = t

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedThread, setSelectedThread] = useState<SelectedThread>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactDraftName, setContactDraftName] = useState('')
  const [isContactActionLoading, setIsContactActionLoading] = useState(false)
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
    if (!query) return contacts
    return contacts.filter(
      (contact) => contact.name.toLowerCase().includes(query) || contact.phone.toLowerCase().includes(query),
    )
  }, [contacts, search])

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
      setMessages(data.messages)

      await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      })
    } catch {
      if (!silent) toast.error(ui?.common?.couldNotLoadMessages ?? 'Could not load messages')
    }
  }, [ui?.common?.couldNotLoadMessages])

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true)
      await Promise.all([fetchConversations(), fetchContacts(), fetchAvailableUsers()])
      setIsBootLoading(false)
    }

    void load()

    const interval = setInterval(() => {
      void fetchConversations()
      if (selectedConversationId) {
        void fetchMessages(selectedConversationId, true)
      }
    }, 5000)

    return () => clearInterval(interval)
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
      toast.error(ui?.common?.couldNotStartConversation ?? 'Could not start conversation')
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
        }),
      })

      if (!response.ok) {
        throw new Error('Could not send message')
      }

      setNewMessage('')
      await fetchMessages(selectedConversationId)
      await fetchConversations()
    } catch {
      toast.error(ui?.common?.couldNotSendMessage ?? 'Could not send message')
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
        return ui?.roles?.superAdmin ?? 'Super Admin'
      case 'MIDDLE_ADMIN':
        return ui?.roles?.middleAdmin ?? 'Middle Admin'
      case 'LOW_ADMIN':
        return ui?.roles?.lowAdmin ?? 'Low Admin'
      case 'COURIER':
        return ui?.roles?.courier ?? 'Courier'
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
                {ui?.chat?.title ?? 'Chat'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {ui?.chat?.subtitle ?? 'Direct team chat + AI agents in one place.'}
              </p>
            </div>

            <Button
              aria-label={ui?.chat?.newConversation ?? 'New conversation'}
              title={ui?.chat?.newConversation ?? 'New conversation'}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setShowUserList((prev) => !prev)
                setMobilePane('list')
              }}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3">
            <SearchPanel
              value={search}
              onChange={setSearch}
              placeholder={
                showUserList
                  ? ui?.chat?.searchUsers ?? 'Search users'
                  : ui?.chat?.searchConversations ?? 'Search conversations'
              }
              className="max-w-none"
            />
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {isBootLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-sm text-muted-foreground">{ui?.common?.loading ?? 'Loading...'}</div>
            </div>
          ) : showUserList ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {ui?.chat?.noUsers ?? 'No users available.'}
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
                          {user.id === TAMBO_AI_AGENT.id ? (ui?.chat?.aiHint ?? 'AI agent via Tambo') : user.email}
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
                      {ui?.chat?.aiHint ?? 'AI agent via Tambo'}
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
                        {contact.lastMessage?.content || (contact.state === 'DISABLED' ? 'Disabled' : ui?.chat?.noMessagesYet ?? 'No messages yet.')}
                      </div>
                    </div>
                  </Button>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {ui?.chat?.noConversations ?? 'No conversations yet.'}
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
                        {conversation.lastMessage?.content || (ui?.chat?.noMessagesYet ?? 'No messages yet.')}
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
                    <p className="mt-1 text-sm text-muted-foreground">{ui?.chat?.aiHint ?? 'AI agent via Tambo'}</p>
                  </div>
                  <Button
                    aria-label={ui?.chat?.newConversation ?? 'Select people'}
                    title={ui?.chat?.newConversation ?? 'Select people'}
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
                    <Button type="button" variant="ghost" size="icon" title="Edit contact" aria-label="Edit contact" onClick={() => { setEditingContactId(selectedContact.id); setContactDraftName(selectedContact.name) }}><Pencil className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" title="Enable contact" aria-label="Enable contact" disabled={isContactActionLoading || selectedContact.state === 'ENABLED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'ENABLED' })}><Power className="size-4 text-emerald-600" /></Button>
                    <Button type="button" variant="ghost" size="icon" title="Disable contact" aria-label="Disable contact" disabled={isContactActionLoading || selectedContact.state === 'DISABLED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'DISABLED' })}><PowerOff className="size-4 text-amber-600" /></Button>
                    <Button type="button" variant="ghost" size="icon" title="Move contact to trash" aria-label="Move contact to trash" disabled={isContactActionLoading || selectedContact.state === 'DELETED'} onClick={() => void updateContact({ id: selectedContact.id, state: 'DELETED' })}><Trash2 className="size-4 text-red-600" /></Button>
                  </div>
                ) : null}

                {isNarrowView ? (
                  <Button
                    aria-label={ui?.chat?.newConversation ?? 'Select people'}
                    title={ui?.chat?.newConversation ?? 'Select people'}
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

            <CardContent className="flex h-full min-h-0 flex-col p-4">
              {editingContactId === selectedContact?.id ? (
                <div className="mb-3 flex gap-2 border-b border-border/60 pb-3">
                  <Input value={contactDraftName} onChange={(event) => setContactDraftName(event.target.value)} aria-label="Contact name" />
                  <Button type="button" disabled={isContactActionLoading || !contactDraftName.trim()} onClick={() => void updateContact({ id: editingContactId, name: contactDraftName.trim() })}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditingContactId(null)}>Cancel</Button>
                </div>
              ) : null}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => {
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
                        <div className="text-sm leading-6">{message.content}</div>
                        <div className="mt-1 text-[11px] opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

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
                  placeholder={selectedSystemConversation ? 'System' : selectedContactDisabled ? 'Contact is disabled' : ui?.chat?.writeMessage ?? 'Write a message...'}
                  className="flex-1"
                />
                <Button onClick={() => void sendMessage()} disabled={!newMessage.trim() || selectedSystemConversation || selectedContactDisabled} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full min-h-[640px] items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">{ui?.chat?.selectConversation ?? 'Select a conversation'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {ui?.chat?.selectConversationHint ??
                  'Choose a thread or start a new one (you can also open an AI agent from the user list).'}
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
                  {ui?.chat?.newConversation ?? 'Select people'}
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
