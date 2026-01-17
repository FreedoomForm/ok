'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Users } from 'lucide-react'
import { toast } from 'sonner'

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

export function ChatTab() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [availableUsers, setAvailableUsers] = useState<User[]>([])
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [showUserList, setShowUserList] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const currentUserId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').id : null

    useEffect(() => {
        fetchConversations()
        fetchAvailableUsers()
        // Poll for new messages every 5 seconds
        const interval = setInterval(() => {
            if (selectedConversation) {
                fetchMessages(selectedConversation, true)
            }
            fetchConversations()
        }, 5000)

        return () => clearInterval(interval)
    }, [selectedConversation])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/chat/conversations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setConversations(data.conversations)
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        }
    }

    const fetchAvailableUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/chat/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setAvailableUsers(data.users)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const fetchMessages = async (conversationId: string, silent = false) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setMessages(data.messages)

                // Mark messages as read
                await fetch('/api/chat/messages', {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ conversationId })
                })
            }
        } catch (error) {
            if (!silent) {
                console.error('Error fetching messages:', error)
            }
        }
    }

    const startConversation = async (userId: string) => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const response = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ participantId: userId })
            })

            if (response.ok) {
                const data = await response.json()
                setSelectedConversation(data.conversation.id)
                setShowUserList(false)
                await fetchConversations()
                await fetchMessages(data.conversation.id)
            }
        } catch (error) {
            toast.error('Ошибка создания разговора')
        } finally {
            setLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: selectedConversation,
                    content: newMessage.trim()
                })
            })

            if (response.ok) {
                setNewMessage('')
                await fetchMessages(selectedConversation)
                await fetchConversations()
            } else {
                toast.error('Ошибка отправки сообщения')
            }
        } catch (error) {
            toast.error('Ошибка соединения')
        }
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800'
            case 'MIDDLE_ADMIN': return 'bg-blue-100 text-blue-800'
            case 'LOW_ADMIN': return 'bg-green-100 text-green-800'
            case 'COURIER': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'Супер Админ'
            case 'MIDDLE_ADMIN': return 'Средний Админ'
            case 'LOW_ADMIN': return 'Низкий Админ'
            case 'COURIER': return 'Курьер'
            default: return role
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Conversations List */}
            <Card className="md:col-span-1">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Чаты</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowUserList(!showUserList)}
                        >
                            <Users className="w-4 h-4 mr-1" />
                            Новый
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {showUserList ? (
                        <div className="max-h-[500px] overflow-y-auto">
                            {availableUsers.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    Нет доступных пользователей
                                </div>
                            ) : (
                                availableUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => startConversation(user.id)}
                                        className="w-full p-3 hover:bg-muted flex items-center gap-3 border-b"
                                    >
                                        <Avatar>
                                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium">{user.name}</div>
                                            <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                                                {getRoleLabel(user.role)}
                                            </Badge>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto">
                            {conversations.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    Нет разговоров
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <button
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConversation(conv.id)
                                            fetchMessages(conv.id)
                                        }}
                                        className={`w-full p-3 hover:bg-muted flex items-center gap-3 border-b ${selectedConversation === conv.id ? 'bg-muted' : ''
                                            }`}
                                    >
                                        <Avatar>
                                            <AvatarFallback>{conv.otherParticipant.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium">{conv.otherParticipant.name}</div>
                                                {conv.unreadCount > 0 && (
                                                    <Badge className="bg-red-500 text-white text-xs">
                                                        {conv.unreadCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {conv.lastMessage?.content || 'Нет сообщений'}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Messages Area */}
            <Card className="md:col-span-2">
                {selectedConversation ? (
                    <>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">
                                {conversations.find(c => c.id === selectedConversation)?.otherParticipant.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col h-[500px]">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg ${message.senderId === currentUserId
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                                }`}
                                        >
                                            <div className="text-sm">{message.content}</div>
                                            <div className="text-xs opacity-70 mt-1">
                                                {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Введите сообщение..."
                                    className="flex-1"
                                />
                                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                ) : (
                    <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                        Выберите разговор или начните новый
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
