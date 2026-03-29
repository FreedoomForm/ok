'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquarePlus, Send, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchPanel } from '@/components/ui/search-panel'
import { cn } from '@/lib/utils'
import { getJsonFromLocalStorage } from '@/lib/browser-storage'
import { TamboAgentWidget } from '@/components/tambo/TamboAgentWidget'
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  id: string
  name: string
  email: string
  role: string
}

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
}

interface Conversation {
  id: string
  otherParticipant: User
  lastMessage: {
    content: string
    createdAt: string
    isRead: boolean
    senderId: string
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

export function ChatUnifiedTab({ initialShowUserList = false }: ChatUnifiedTabProps) {
  const { t } = useLanguage()
  const ui = (t as any)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedThread, setSelectedThread] = useState<SelectedThread>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
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
    const load = async () => {
      setIsBootLoading(true)
      await Promise.all([fetchConversations(), fetchAvailableUsers()])
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
  }, [selectedConversationId])

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

  const selectedConversationData = useMemo(() => {
    if (!selectedConversationId) return null
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null
  }, [conversations, selectedConversationId])

  async function fetchConversations() {
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
  }

  async function fetchAvailableUsers() {
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
  }

  async function fetchMessages(conversationId: string, silent = false) {
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
  }

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
      await fetchMessages(data.conversation.id)
    } catch {
      toast.error(ui?.common?.couldNotStartConversation ?? 'Could not start conversation')
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversationId) return

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
        <Card className="glass-card min-h-0 overflow-hidden">
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
                      className="flex min-w-0 flex-1 items-center gap-3 justify-start text-left transition-colors hover:text-foreground"
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
                    'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 justify-start text-left transition-colors hover:bg-muted/40',
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

              {filteredConversations.length === 0 ? (
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
                      'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 justify-start text-left transition-colors hover:bg-muted/40',
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
            'glass-card min-h-0 overflow-hidden',
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
              <TamboAgentWidget embedded />
            </CardContent>
          </>
        ) : selectedConversationId ? (
          <>
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedConversationData?.otherParticipant.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{selectedConversationData?.otherParticipant.name}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">
                      {selectedConversationData?.otherParticipant.email}
                    </p>
                  </div>
                </div>

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
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => (
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
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
                <Input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={ui?.chat?.writeMessage ?? 'Write a message...'}
                  className="flex-1"
                />
                <Button onClick={() => void sendMessage()} disabled={!newMessage.trim()} size="icon">
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
