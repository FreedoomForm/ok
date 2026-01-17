'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistoryTable } from '@/components/admin/HistoryTable'
import { InterfaceSettings } from '@/components/admin/InterfaceSettings'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Settings,
  BarChart3,
  History,
  User,
  LogOut,
  Plus,
  Trash2,
  Pause,
  Play,
  Eye,
  Edit,
  Save,
  MessageSquare,
  LayoutDashboard
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChatTab } from '@/components/chat/ChatTab'

interface Admin {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

interface ActionLog {
  id: string
  action: string
  entityType: string
  description: string
  createdAt: string
  admin: {
    name: string
  }
}

interface OrderStatistics {
  successfulOrders: number
  failedOrders: number
  pendingOrders: number
  inDeliveryOrders: number
  pausedOrders: number
  prepaidOrders: number
  unpaidOrders: number
  cardOrders: number
  cashOrders: number
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
  specialPreferenceCustomers: number
  orders1200: number
  orders1600: number
  orders2000: number
  orders2500: number
  orders3000: number
  singleItemOrders: number
  multiItemOrders: number
}

export default function SuperAdminPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('admins')
  const [middleAdmins, setMiddleAdmins] = useState<Admin[]>([])
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([])
  const [orderStatistics, setOrderStatistics] = useState<OrderStatistics | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedPassword, setSelectedPassword] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [adminName, setAdminName] = useState('Super Admin') // Added adminName state

  useEffect(() => {
    // Initialize profile form with current user data
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setAdminName(user.name || 'Super Admin')
      setProfileForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }))
    }
  }, [])

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm)
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('user', JSON.stringify(data.user))
        setAdminName(data.user.name)
        setIsProfileOpen(false)
        setProfileForm(prev => ({ ...prev, password: '' })) // Clear password
        toast.success('Профиль успешно обновлен')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Ошибка обновления профиля')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    }
  }

  useEffect(() => {
    // Fetch data on initial load
    // Authentication is handled by NextAuth middleware
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch middle admins
      const adminsResponse = await fetch('/api/admin/middle-admins', {
        headers: {
        }
      })

      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json()
        setMiddleAdmins(adminsData)
      }

      // Fetch action logs
      const logsResponse = await fetch('/api/admin/action-logs', {
        headers: {
        }
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        // API returns { logs: [...], total: ..., hasMore: ... }
        setActionLogs(logsData.logs || logsData)
      }

      // Fetch order statistics
      const statsResponse = await fetch('/api/admin/statistics', {
        headers: {
        }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setOrderStatistics(statsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    // Clear localStorage (for backward compatibility)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Sign out from NextAuth (clears session cookies)
    await signOut({ callbackUrl: '/', redirect: true })
  }

  const toggleAdminStatus = async (adminId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/${adminId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error toggling admin status:', error)
    }
  }

  const deleteAdmin = async (adminId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого администратора?')) return

    try {
      const response = await fetch(`/api/admin/${adminId}/delete`, {
        method: 'DELETE',
        headers: {
        }
      })

      if (response.ok) {
        fetchData()
        toast.success('Администратор удален')
      } else {
        toast.error('Ошибка удаления администратора')
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError('')

    try {
      const response = await fetch('/api/admin/middle-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createFormData)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateModalOpen(false)
        setCreateFormData({ name: '', email: '', password: '' })
        fetchData()
      } else {
        setCreateError(data.error || 'Ошибка создания администратора')
      }
    } catch (error) {
      setCreateError('Ошибка соединения с сервером')
    } finally {
      setIsCreating(false)
    }
  }

  const viewPassword = async (adminId: string) => {
    try {
      const response = await fetch(`/api/admin/${adminId}/password`, {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedPassword(data.password)
        setPasswordModalOpen(true)
      } else {
        toast.error('Ошибка получения пароля')
      }
    } catch (error) {
      console.error('Error viewing password:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold tracking-tight text-gradient">{t.admin.dashboard}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-foreground">{adminName}</p>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>

                <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Редактирование профиля</DialogTitle>
                      <DialogDescription>
                        Измените свои личные данные здесь. Нажмите сохранить, когда закончите.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Имя</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Новый пароль (оставьте пустым, если не меняете)</Label>
                        <Input
                          id="password"
                          type="password"
                          value={profileForm.password}
                          onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateProfile}>Сохранить изменения</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t.common.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-xl">
              <TabsTrigger
                value="admins"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Users className="w-4 h-4" />
                {t.admin.admins}
              </TabsTrigger>
              <TabsTrigger
                value="interface"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t.admin.interface}
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <MessageSquare className="w-4 h-4" />
                Чат
              </TabsTrigger>
              <TabsTrigger
                value="statistics"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4" />
                {t.admin.statistics}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <History className="w-4 h-4" />
                {t.admin.history}
              </TabsTrigger>
            </TabsList>

            {/* Admins Tab */}
            <TabsContent value="admins" className="space-y-6">
              <Card className="glass-card border-none">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Управление Средними Администраторами</CardTitle>
                      <CardDescription>
                        Добавляйте, удаляйте и управляйте средними администраторами системы
                      </CardDescription>
                    </div>
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить администратора
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Добавить Среднего Администратора</DialogTitle>
                          <DialogDescription>
                            Создайте нового среднего администратора для системы
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateAdmin}>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="name" className="text-right">
                                Имя
                              </Label>
                              <Input
                                id="name"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="email" className="text-right">
                                Email
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={createFormData.email}
                                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="password" className="text-right">
                                Пароль
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                value={createFormData.password}
                                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="col-span-3"
                                required
                                minLength={6}
                              />
                            </div>
                            {createError && (
                              <div className="col-span-4">
                                <Alert variant="destructive">
                                  <AlertDescription>{createError}</AlertDescription>
                                </Alert>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                              Отмена
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                              {isCreating ? 'Создание...' : 'Создать'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Password Modal */}
                    <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Пароль администратора</DialogTitle>
                          <DialogDescription>
                            Пароль для доступа к системе
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <div className="bg-slate-100 p-3 rounded-md">
                            <p className="font-mono text-sm">{selectedPassword}</p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => setPasswordModalOpen(false)}>
                            Закрыть
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {middleAdmins.map((admin) => (
                      <div key={admin.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{admin.name}</p>
                            <p className="text-sm text-slate-500">{admin.email}</p>
                            <Badge variant={admin.isActive ? "default" : "secondary"}>
                              {admin.isActive ? "Активен" : "Приостановлен"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewPassword(admin.id)}
                            className="flex-1 md:flex-none"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Пароль
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminStatus(admin.id, admin.isActive)}
                            className="flex-1 md:flex-none"
                          >
                            {admin.isActive ? (
                              <Pause className="w-4 h-4 mr-1" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            {admin.isActive ? "Приостановить" : "Активировать"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteAdmin(admin.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interface Tab */}
            <TabsContent value="interface" className="space-y-6">
              <InterfaceSettings />
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-6">
              <ChatTab />
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="statistics" className="space-y-6">
              {/* Order Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Успешные заказы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {orderStatistics?.successfulOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Доставлено</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Неудачные заказы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {orderStatistics?.failedOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Отменено</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">В доставке</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {orderStatistics?.inDeliveryOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">В процессе</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ожидают</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {orderStatistics?.pendingOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">В очереди</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Предоплаченные</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {orderStatistics?.prepaidOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Оплачено</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Неоплаченные</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {orderStatistics?.unpaidOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Оплата при получении</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Оплата картой</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {orderStatistics?.cardOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Онлайн оплата</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Оплата наличными</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {orderStatistics?.cashOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">При получении</p>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ежедневные клиенты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {orderStatistics?.dailyCustomers || 0}
                    </div>
                    <p className="text-xs text-slate-500">Каждый день</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Четные дни</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-600">
                      {orderStatistics?.evenDayCustomers || 0}
                    </div>
                    <p className="text-xs text-slate-500">По четным дням</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Нечетные дни</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pink-600">
                      {orderStatistics?.oddDayCustomers || 0}
                    </div>
                    <p className="text-xs text-slate-500">По нечетным дням</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Особые предпочтения</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {orderStatistics?.specialPreferenceCustomers || 0}
                    </div>
                    <p className="text-xs text-slate-500">С особенностями</p>
                  </CardContent>
                </Card>
              </div>

              {/* Calories Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">1200 ккал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {orderStatistics?.orders1200 || 0}
                    </div>
                    <p className="text-xs text-slate-500">Низкокалорийные</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">1600 ккал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {orderStatistics?.orders1600 || 0}
                    </div>
                    <p className="text-xs text-slate-500">Стандарт</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">2000 ккал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {orderStatistics?.orders2000 || 0}
                    </div>
                    <p className="text-xs text-slate-500">Средние</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">2500 ккал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {orderStatistics?.orders2500 || 0}
                    </div>
                    <p className="text-xs text-slate-500">Высокие</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">3000 ккал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {orderStatistics?.orders3000 || 0}
                    </div>
                    <p className="text-xs text-slate-500">Очень высокие</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quantity Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Одинарные заказы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {orderStatistics?.singleItemOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Один рацион</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Множественные заказы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {orderStatistics?.multiItemOrders || 0}
                    </div>
                    <p className="text-xs text-slate-500">Два и более рационов</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <HistoryTable role="SUPER_ADMIN" />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main >
    </div >
  )
}