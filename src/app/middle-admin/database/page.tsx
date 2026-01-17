'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExcelEditor } from '@/components/excel'
import { AIChatInterface } from '@/components/ai/ChatInterface'
import { UserList } from '@/components/collaboration/UserList'
import { usePresence } from '@/hooks/useCollaboration'
import { Database, Table2, MessageSquare, Settings, Sparkles } from 'lucide-react'

interface DatabasePageProps {
    adminId: string
    adminName: string
}

export default function DatabasePage({ adminId, adminName }: DatabasePageProps) {
    const [activeTab, setActiveTab] = useState('editor')
    const [showAIChat, setShowAIChat] = useState(false)

    // Real-time presence
    const { users: onlineUsers, myColor } = usePresence(adminId, adminId, adminName)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Database className="w-6 h-6" />
                        База данных
                    </h2>
                    <p className="text-muted-foreground">
                        Управляйте данными как в Excel
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Online Users */}
                    <UserList users={onlineUsers} />

                    {/* AI Assistant Button */}
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowAIChat(!showAIChat)}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Ассистент
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="editor" className="gap-2">
                        <Table2 className="w-4 h-4" />
                        Редактор
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="gap-2">
                        Клиенты
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="gap-2">
                        Заказы
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Настройки
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" className="mt-4">
                    <ExcelEditor
                        adminId={adminId}
                        onAIAssist={() => setShowAIChat(true)}
                    />
                </TabsContent>

                <TabsContent value="customers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Клиенты</CardTitle>
                            <CardDescription>
                                Данные клиентов синхронизируются из Excel редактора
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Используйте вкладку "Редактор" для управления клиентами
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Заказы</CardTitle>
                            <CardDescription>
                                Данные заказов синхронизируются из Excel редактора
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Используйте вкладку "Редактор" для управления заказами
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Настройки базы данных</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">Синхронизация с Firebase</p>
                                    <p className="text-sm text-muted-foreground">
                                        Данные сохраняются в реальном времени
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm text-green-600">Подключено</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">Экспорт данных</p>
                                    <p className="text-sm text-muted-foreground">
                                        Скачать данные в формате CSV или JSON
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">CSV</Button>
                                    <Button variant="outline" size="sm">JSON</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Chat Interface */}
            {showAIChat && (
                <AIChatInterface
                    adminId={adminId}
                    onTaskExecute={async (task, context) => {
                        console.log('Executing task:', task, context)
                        // Task execution logic here
                    }}
                />
            )}
        </div>
    )
}
