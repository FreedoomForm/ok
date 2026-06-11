'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, MessageSquarePlus, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getJsonFromLocalStorage } from '@/modules/shared/browser-storage'
import { SearchPanel } from '@/components/ui/search-panel'
import { TamboAgentWidget } from '@/components/tambo/TamboAgentWidget'

interface User {
  id: string
  name: string
  email: string
  role: string
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

const TAMBO_AI_AGENT: User = {
  id: 'tambo-ai',
  name: 'Tambo AI',
  email: '',
  role: 'AI_AGENT',
}

function openTamboWithPrompt(prompt: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('tambo:open-chat', { detail: { prompt, newThread: true } }))
}

function getStoredUserId() {
  if (typeof window === 'undefined') return null
  const user = getJsonFromLocalStorage<{ id?: string }>('user')
  if (!user || typeof user.id !== 'string') return null
  return user.id
}

export function ChatTab() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [selectedAiAgent, setSelectedAiAgent] = useState<User | null>(null)
  const [isBootLoading, setIsBootLoading] = useState(true)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = useMemo(() => getStoredUserId(), [])

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true)
      await Promise.all([fetchConversations(), fetchAvailableUsers()])
      setIsBootLoading(false)
    }

    void load()

    const interval = setInterval(() => {
      void fetchConversations()
      if (selectedConversation) {
        void fetchMessages(selectedConversation, true)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) =>
      conversation.otherParticipant.name.toLowerCase().includes(query) ||
      conversation.otherParticipant.email.toLowerCase().includes(query)
    )
  }, [conversations, search])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return availableUsers
    return availableUsers.filter((user) =>
      user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    )
  }, [availableUsers, search])

  const selectedConversationData = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversation) ?? null,
    [conversations, selectedConversation]
  )

  async function fetchConversations() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setConversations(result.data?.conversations ?? result.conversations ?? [])
      }
    } catch {
      // ignore transient polling errors
    }
  }

  async function fetchAvailableUsers() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        const users = Array.isArray(result?.data?.users) ? result.data.users : (Array.isArray(result?.users) ? result.users : [])
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Unable to fetch messages')
      }

      const result = await response.json()
      setMessages(result.data?.messages ?? result.messages ?? [])

      await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      })
    } catch {
      if (!silent) {
        toast.error('Could not load messages')
      }
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

      const result = await response.json()
      const conversation = result.data?.conversation ?? result.conversation
      setSelectedConversation(conversation.id)
      setShowUserList(false)
      await fetchConversations()
      await fetchMessages(conversation.id)
    } catch {
      toast.error('Could not start conversation')
    }
  }

  function selectAiAgent(agent: User) {
    setSelectedConversation(null)
    setSelectedAiAgent(agent)
    setShowUserList(false)
    openTamboWithPrompt(
      'You are Tambo AI: a manager assistant for operations and audits. Answer with practical steps.'
    )
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Could not send message')
      }

      setNewMessage('')
      await fetchMessages(selectedConversation)
      await fetchConversations()
    } catch {
      toast.error('Could not send message')
    }
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
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'AI_AGENT':
        return 'AI'
      case 'SUPER_ADMIN':
        return 'Super Admin'
      case 'MIDDLE_ADMIN':
        return 'Middle Admin'
      case 'LOW_ADMIN':
        return 'Low Admin'
      case 'COURIER':
        return 'Courier'
      default:
        return role
    }
  }

  return (
    <div className="grid h-[640px] grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="glass-card overflow-hidden">
 <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Team chat</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Direct communication across admin and courier roles.</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowUserList((prev) => !prev)}>
              <MessageSquarePlus className="h-4 w-4" />
              New
            </Button>
          </div>
          <div className="mt-3">
            <SearchPanel
              value={search}
              onChange={setSearch}
              placeholder={showUserList ? 'Search users' : 'Search conversations'}
              className="max-w-none"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isBootLoading ? (
            <div className="flex h-[520px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : showUserList ? (
            <div className="max-h-[520px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No users available.</div>
              ) : (
                filteredUsers.map((user) => (
                  <Button
                    key={user.id}
                    type="button"
                    onClick={() => (user.id === TAMBO_AI_AGENT.id ? selectAiAgent(user) : void startConversation(user.id))}
                    variant="ghost"
 className="flex w-full items-center gap-3 px-4 py-3 justify-start text-left transition-colors hover:bg-muted/40"
                  >
                    <Avatar>
                      <AvatarFallback>{user.id === TAMBO_AI_AGENT.id ? 'AI' : user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.id === TAMBO_AI_AGENT.id ? 'AI agent via Tambo' : user.email}</div>
                    </div>
                    <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                  </Button>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {selectedAiAgent ? (
                <Button
                  type="button"
                  onClick={() => selectAiAgent(selectedAiAgent)}
                  variant="ghost"
 className="flex w-full items-center gap-3 px-4 py-3 justify-start text-left transition-colors bg-muted/50 hover:bg-muted/60"
                >
                  <Avatar>
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{selectedAiAgent.name}</div>
                    <div className="truncate text-xs text-muted-foreground">AI agent via Tambo</div>
                  </div>
                  <Badge className={getRoleColor('AI_AGENT')}>AI</Badge>
                </Button>
              ) : null}
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</div>
              ) : (
                filteredConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedConversation(conversation.id)
                      setSelectedAiAgent(null)
                      void fetchMessages(conversation.id)
                    }}
                    variant="ghost"
 className={`flex w-full items-center gap-3 px-4 py-3 justify-start text-left transition-colors hover:bg-muted/40 ${
                      selectedConversation === conversation.id ? 'bg-muted/50' : ''
                    }`}
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
                        {conversation.lastMessage?.content || 'No messages yet.'}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        {selectedAiAgent ? (
          <>
 <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedAiAgent.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">AI agent via Tambo</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[560px] p-0">
              <TamboAgentWidget embedded />
            </CardContent>
          </>
        ) : selectedConversation ? (
          <>
 <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{selectedConversationData?.otherParticipant.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedConversationData?.otherParticipant.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversationData?.otherParticipant.email}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex h-[560px] flex-col p-4">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                        message.senderId === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="text-sm leading-6">{message.content}</div>
                      <div className="mt-1 text-[11px] opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

 <div className="mt-4 flex gap-2 pt-4">
                <Input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder="Write a message..."
                  className="flex-1"
                />
                <Button onClick={() => void sendMessage()} disabled={!newMessage.trim()} className="rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full min-h-[640px] items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Select a conversation</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose an existing thread or start a new one from the user list.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}


