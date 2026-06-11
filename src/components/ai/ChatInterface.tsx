'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Bot, CheckCircle2, Loader2, Send, Sparkles, User, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

interface SubTask {
  id: number
  description: string
  status: TaskStatus
  parameters?: Record<string, unknown>
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tasks?: SubTask[]
}

interface ChatResponse {
  response?: string
  tasks?: Array<{
    id: number
    description: string
    parameters?: Record<string, unknown>
  }>
}

interface AIChatInterfaceProps {
  adminId: string
  websiteId?: string
  onTaskExecute?: (task: string, context: unknown) => Promise<unknown>
}

const START_MESSAGE: Message = {
  id: 'start-message',
  role: 'assistant',
  content:
    'Hi, I can help with operations across your portal: clients, orders, website edits, and daily admin workflows. Describe what you want to update.',
  timestamp: new Date(),
}

export function AIChatInterface({ adminId, websiteId, onTaskExecute }: AIChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([START_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = messagesRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isLoading])

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          adminId,
          websiteId,
          history: messages.slice(-10),
        }),
      })

      const data = (await response.json().catch(() => ({}))) as ChatResponse
      const normalizedTasks: SubTask[] = Array.isArray(data.tasks)
        ? data.tasks.map((task, index) => ({
            id: Number.isFinite(task?.id) ? Number(task.id) : index + 1,
            description: task?.description || `Task ${index + 1}`,
            status: 'pending',
            parameters: task?.parameters,
          }))
        : []

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Request processed. I am ready for the next step.',
        timestamp: new Date(),
        tasks: normalizedTasks,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (normalizedTasks.length > 0 && onTaskExecute) {
        await Promise.all(
          normalizedTasks.map(async (task) => {
            setMessages((prev) =>
              prev.map((message) => {
                if (message.id !== assistantMessage.id || !message.tasks) return message
                return {
                  ...message,
                  tasks: message.tasks.map((row) =>
                    row.id === task.id ? { ...row, status: 'running' as const } : row
                  ),
                }
              })
            )

            try {
              await onTaskExecute(task.description, task.parameters || {})
              setMessages((prev) =>
                prev.map((message) => {
                  if (message.id !== assistantMessage.id || !message.tasks) return message
                  return {
                    ...message,
                    tasks: message.tasks.map((row) =>
                      row.id === task.id ? { ...row, status: 'completed' as const } : row
                    ),
                  }
                })
              )
            } catch {
              setMessages((prev) =>
                prev.map((message) => {
                  if (message.id !== assistantMessage.id || !message.tasks) return message
                  return {
                    ...message,
                    tasks: message.tasks.map((row) =>
                      row.id === task.id ? { ...row, status: 'failed' as const } : row
                    ),
                  }
                })
              )
            }
          })
        )
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'I could not process this request. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const renderTaskStatus = (status: TaskStatus) => {
    if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-600" />
    if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-neutral-800" />
    if (status === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-neutral-700" />
 return <div className="h-3.5 w-3.5 rounded-full" />
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-[0_20px_45px_-24px_rgba(0,0,0,0.65)]"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-[430px]"
          >
 <Card className="overflow-hidden shadow-[0_28px_70px_-48px_rgba(15,23,42,0.85)]">
 <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 pb-3 text-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Bot className="h-4.5 w-4.5" />
                      AI Assistant
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-300">Clients, orders, and website actions from one chat window.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div ref={messagesRef} className="h-[420px] space-y-4 overflow-y-auto p-4">
                  {messages.map((message) => {
                    const assistantMessage = message.role === 'assistant'
                    const userMessage = message.role === 'user'

                    return (
                      <div key={message.id} className={`flex gap-2 ${userMessage ? 'justify-end' : 'justify-start'}`}>
                        {assistantMessage && (
 <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div className={`max-w-[82%] ${userMessage ? 'order-first' : ''}`}>
                          <div
                            className={`rounded-2xl px-3 py-2.5 text-sm leading-6 ${
                              userMessage
                                ? 'bg-slate-900 text-slate-50 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.8)]'
 : ' bg-muted/65 text-foreground'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>

                          {message.tasks && message.tasks.length > 0 && (
 <div className="mt-2 space-y-1.5 rounded-xl bg-card/70 px-2.5 py-2 text-xs">
                              {message.tasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-muted-foreground">
                                  {renderTaskStatus(task.status)}
                                  <span>{task.description}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {userMessage && (
 <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {isLoading && (
                    <div className="flex items-start gap-2">
 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        <Bot className="h-4 w-4" />
                      </div>
 <div className="inline-flex rounded-2xl bg-muted/65 px-3 py-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>

 <div className="p-3">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleSend()
                        }
                      }}
                      placeholder="Describe what to change..."
                      disabled={isLoading}
                    />
                    <Button onClick={() => void handleSend()} disabled={!canSend} className="px-3" aria-label="Send message">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
