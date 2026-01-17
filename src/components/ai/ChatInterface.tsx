'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
    MessageCircle,
    Send,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Bot,
    User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    tasks?: SubTask[]
}

interface SubTask {
    id: number
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed'
}

interface AIChatInterfaceProps {
    adminId: string
    websiteId?: string
    onTaskExecute?: (task: string, context: any) => Promise<any>
}

export function AIChatInterface({ adminId, websiteId, onTaskExecute }: AIChatInterfaceProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Привет! Я AI ассистент. Могу помочь вам с:\n• Созданием и редактированием вкладок\n• Работой с данными клиентов и заказов\n• Модификацией вашего сайта\n\nЧто бы вы хотели сделать?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // Send to AI API
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    adminId,
                    websiteId,
                    history: messages.slice(-10) // Last 10 messages for context
                })
            })

            const data = await response.json()

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Обработка запроса...',
                timestamp: new Date(),
                tasks: data.tasks
            }

            setMessages(prev => [...prev, assistantMessage])

            // If there are tasks to execute
            if (data.tasks && data.tasks.length > 0 && onTaskExecute) {
                // Execute all tasks in parallel
                const taskPromises = data.tasks.map(async (task) => {
                    // Update status to running
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === assistantMessage.id && msg.tasks) {
                            return {
                                ...msg,
                                tasks: msg.tasks.map(t =>
                                    t.id === task.id ? { ...t, status: 'running' as const } : t
                                )
                            }
                        }
                        return msg
                    }))

                    try {
                        await onTaskExecute(task.description, task.parameters)
                        // Update status to completed
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === assistantMessage.id && msg.tasks) {
                                return {
                                    ...msg,
                                    tasks: msg.tasks.map(t =>
                                        t.id === task.id ? { ...t, status: 'completed' as const } : t
                                    )
                                }
                            }
                            return msg
                        }))
                    } catch (error) {
                        // Update status to failed
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === assistantMessage.id && msg.tasks) {
                                return {
                                    ...msg,
                                    tasks: msg.tasks.map(t =>
                                        t.id === task.id ? { ...t, status: 'failed' as const } : t
                                    )
                                }
                            }
                            return msg
                        }))
                    }
                })

                await Promise.all(taskPromises)
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Произошла ошибка. Пожалуйста, попробуйте еще раз.',
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="rounded-full w-14 h-14 shadow-lg bg-purple-600 hover:bg-purple-700"
                        >
                            <Sparkles className="w-6 h-6" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 right-6 z-50 w-[400px]"
                    >
                        <Card className="shadow-2xl border-purple-200">
                            <CardHeader className="pb-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Bot className="w-5 h-5" />
                                        AI Ассистент
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Messages */}
                                <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {message.role === 'assistant' && (
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                        <Bot className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                )}
                                                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                                                    <div
                                                        className={`rounded-lg px-3 py-2 text-sm ${message.role === 'user'
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-muted'
                                                            }`}
                                                    >
                                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                                    </div>

                                                    {/* Task List */}
                                                    {message.tasks && message.tasks.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {message.tasks.map((task) => (
                                                                <div
                                                                    key={task.id}
                                                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                                                >
                                                                    {task.status === 'pending' && (
                                                                        <div className="w-4 h-4 border-2 rounded-full" />
                                                                    )}
                                                                    {task.status === 'running' && (
                                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                                    )}
                                                                    {task.status === 'completed' && (
                                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                    )}
                                                                    {task.status === 'failed' && (
                                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                                    )}
                                                                    <span>{task.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {message.timestamp.toLocaleTimeString('ru-RU', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {isLoading && (
                                            <div className="flex gap-2">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                                    <Bot className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div className="bg-muted rounded-lg px-3 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                {/* Input */}
                                <div className="p-4 border-t">
                                    <div className="flex gap-2">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Напишите сообщение..."
                                            disabled={isLoading}
                                        />
                                        <Button
                                            onClick={handleSend}
                                            disabled={isLoading || !input.trim()}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            <Send className="w-4 h-4" />
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
