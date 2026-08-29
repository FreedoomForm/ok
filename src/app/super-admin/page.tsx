'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  Activity,
  BarChart3,
  History,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { HistoryTable } from '@/components/admin/HistoryTable'
import { InterfaceSettings } from '@/components/admin/InterfaceSettings'
import { ChatTab } from '@/components/chat/ChatTab'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { RoleWorkspaceShell } from '@/components/site/RoleWorkspaceShell'
import type { UniversalCommand, WorkspaceResourcePage } from '@/components/admin/dashboard/shared/workspace-state'

interface Admin {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
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

const ZERO_STATS: OrderStatistics = {
  successfulOrders: 0,
  failedOrders: 0,
  pendingOrders: 0,
  inDeliveryOrders: 0,
  pausedOrders: 0,
  prepaidOrders: 0,
  unpaidOrders: 0,
  cardOrders: 0,
  cashOrders: 0,
  dailyCustomers: 0,
  evenDayCustomers: 0,
  oddDayCustomers: 0,
  specialPreferenceCustomers: 0,
  orders1200: 0,
  orders1600: 0,
  orders2000: 0,
  orders2500: 0,
  orders3000: 0,
  singleItemOrders: 0,
  multiItemOrders: 0,
}

const INITIAL_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
}

const INITIAL_PROFILE_FORM = {
  name: '',
  email: '',
  password: '',
}

const INITIAL_EDIT_FORM = {
  name: '',
  email: '',
}

type AdminStatusFilter = 'all' | 'active' | 'inactive'

function formatShortDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SuperAdminPage() {
  const { t, language } = useLanguage()
  const roleText = language === 'uz'
    ? { superAdmin: 'Super administrator', control: 'Boshqaruv', governance: 'Platforma boshqaruvi', governanceDescription: 'Administratorlar, tizim ko‘rinishi, aloqa va audit tarixini boshqaring.', profile: 'Profil sozlamalari', profileDescription: 'Super administrator ma’lumotlari va hisob ma’lumotlarini yangilang.', name: 'Ism', email: 'Email', newPassword: 'Yangi parol (ixtiyoriy)', createAdmin: 'Administrator yaratish', createDescription: 'Bu hisob darhol middle-admin boshqaruv paneliga kirish oladi.', fullName: 'To‘liq ism', password: 'Parol', editAdmin: 'Administratorni tahrirlash', editDescription: 'Middle-admin ismi yoki elektron pochtasini yangilang.', passwordDescription: 'Bu ma’lumotni saqlang. Qiymat faqat bir marta ko‘rsatiladi.', copy: 'Nusxalash', close: 'Yopish', deleteAdmin: 'Administratorni o‘chirish' }
    : { superAdmin: 'Супер-администратор', control: 'Управление', governance: 'Управление платформой', governanceDescription: 'Управляйте администраторами, видимостью системы, связью и историей аудита.', profile: 'Настройки профиля', profileDescription: 'Обновите данные и учётные данные супер-администратора.', name: 'Имя', email: 'Электронная почта', newPassword: 'Новый пароль (необязательно)', createAdmin: 'Создать администратора', createDescription: 'Этот аккаунт сразу получит доступ к панели middle-admin.', fullName: 'Полное имя', password: 'Пароль', editAdmin: 'Редактировать администратора', editDescription: 'Измените имя или электронную почту middle-admin.', passwordDescription: 'Сохраните эти данные. Значение показывается только один раз.', copy: 'Копировать', close: 'Закрыть', deleteAdmin: 'Удалить администратора' }
  const [activeTab, setActiveTab] = useState('admins')
  const [middleAdmins, setMiddleAdmins] = useState<Admin[]>([])
  const [orderStatistics, setOrderStatistics] = useState<OrderStatistics>(ZERO_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState(INITIAL_CREATE_FORM)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('all')
  const [mutatingAdminId, setMutatingAdminId] = useState<string | null>(null)
  const [adminIdPendingDelete, setAdminIdPendingDelete] = useState<string | null>(null)
  const [adminIdEditing, setAdminIdEditing] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false)
  const [editError, setEditError] = useState('')
  const [editFormData, setEditFormData] = useState(INITIAL_EDIT_FORM)

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedPassword, setSelectedPassword] = useState('')
  const [selectedPasswordAdminName, setSelectedPasswordAdminName] = useState('')

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_FORM)
  const [adminName, setAdminName] = useState(roleText.superAdmin)

  const loadDashboardData = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const [adminsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/middle-admins'),
        fetch('/api/admin/statistics'),
      ])

      if (
        adminsResponse.status === 401 ||
        adminsResponse.status === 403 ||
        statsResponse.status === 401 ||
        statsResponse.status === 403
      ) {
        window.location.href = '/login'
        return
      }

      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json()
        setMiddleAdmins(Array.isArray(adminsData) ? adminsData : [])
      } else {
        const payload = await adminsResponse.json().catch(() => null)
        toast.error(payload?.error || 'Failed to load admins')
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setOrderStatistics(statsData || ZERO_STATS)
      } else {
        const payload = await statsResponse.json().catch(() => null)
        toast.error(payload?.error || 'Failed to load statistics')
      }
    } catch {
      toast.error('Could not load dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const nextName = user?.name || roleText.superAdmin
        setAdminName(nextName)
        setProfileForm({
          name: nextName,
          email: user?.email || '',
          password: '',
        })
      } catch {
        // ignore malformed local storage
      }
    }

    void loadDashboardData()
  }, [])

  const filteredAdmins = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return middleAdmins.filter((admin) => {
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'active' && admin.isActive) ||
        (statusFilter === 'inactive' && !admin.isActive)

      if (!statusMatch) return false
      if (!normalizedSearch) return true

      return [admin.name, admin.email].some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [middleAdmins, searchTerm, statusFilter])

  const activeAdminsCount = useMemo(
    () => middleAdmins.filter((admin) => admin.isActive).length,
    [middleAdmins]
  )

  const totalOrdersCount = useMemo(
    () =>
      orderStatistics.successfulOrders +
      orderStatistics.failedOrders +
      orderStatistics.pendingOrders +
      orderStatistics.inDeliveryOrders +
      orderStatistics.pausedOrders,
    [orderStatistics]
  )

  const successRate = useMemo(() => {
    if (totalOrdersCount === 0) return 0
    return Math.round((orderStatistics.successfulOrders / totalOrdersCount) * 100)
  }, [orderStatistics.successfulOrders, totalOrdersCount])

  const handleLogout = async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    await signOut({ callbackUrl: '/', redirect: true })
  }

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to update profile')
        return
      }

      const nextUser = payload?.user
      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser))
        setAdminName(nextUser.name || adminName)
      }
      setIsProfileOpen(false)
      setProfileForm((prev) => ({ ...prev, password: '' }))
      toast.success('Profile updated')
    } catch {
      toast.error('Could not connect to server')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsCreating(true)
    setCreateError('')

    try {
      const response = await fetch('/api/admin/middle-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setCreateError(payload?.error || 'Failed to create admin')
        return
      }

      toast.success('Middle admin created')
      setCreateFormData(INITIAL_CREATE_FORM)
      setIsCreateModalOpen(false)
      await loadDashboardData(true)
    } catch {
      setCreateError('Could not connect to server')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleAdminStatus = async (admin: Admin) => {
    setMutatingAdminId(admin.id)
    try {
      const response = await fetch(`/api/admin/${admin.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !admin.isActive }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to update admin status')
        return
      }

      toast.success(admin.isActive ? 'Admin paused' : 'Admin activated')
      await loadDashboardData(true)
    } catch {
      toast.error('Could not connect to server')
    } finally {
      setMutatingAdminId(null)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!adminIdPendingDelete) return
    setMutatingAdminId(adminIdPendingDelete)

    try {
      const response = await fetch(`/api/admin/${adminIdPendingDelete}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to delete admin')
        return
      }

      toast.success('Admin deleted')
      setAdminIdPendingDelete(null)
      await loadDashboardData(true)
    } catch {
      toast.error('Could not connect to server')
    } finally {
      setMutatingAdminId(null)
    }
  }

  const handleOpenEditAdmin = (admin: Admin) => {
    setAdminIdEditing(admin.id)
    setEditFormData({
      name: admin.name,
      email: admin.email,
    })
    setEditError('')
    setIsEditModalOpen(true)
  }

  const handleEditAdmin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adminIdEditing) return

    setIsUpdatingAdmin(true)
    setEditError('')
    try {
      const response = await fetch(`/api/admin/${adminIdEditing}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setEditError(payload?.error || 'Failed to update admin')
        return
      }

      toast.success('Admin updated')
      setIsEditModalOpen(false)
      setAdminIdEditing(null)
      await loadDashboardData(true)
    } catch {
      setEditError('Could not connect to server')
    } finally {
      setIsUpdatingAdmin(false)
    }
  }

  const handleResetPassword = async (admin: Admin) => {
    setMutatingAdminId(admin.id)
    try {
      const response = await fetch(`/api/admin/${admin.id}/password`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.password) {
        toast.error(payload?.error || 'Failed to reset password')
        return
      }

      setSelectedPassword(payload.password)
      setSelectedPasswordAdminName(admin.name)
      setPasswordModalOpen(true)
      toast.success('New password generated')
    } catch {
      toast.error('Could not connect to server')
    } finally {
      setMutatingAdminId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    )
  }

  const rolePages = ['chat', 'settings', 'admins'] as const
  const rolePageLabels = {
    chat: 'Чат', settings: 'Настройки', admins: 'Администраторы',
    ingredients: '', cooking: '', dishes: '', groups: '', sets: '', finance: '', contracts: '', transactions: '', orders: '', routes: '', couriers: '', clients: '', calculator: '',
  } as const
  const roleCommandLabels = { key: 'Ключ', search: 'Поиск', create: 'Создать', enable: 'Включить', disable: 'Отключить', trash: 'Корзина', edit: 'Изменить', sms: 'Сообщение', 'realtime-ai': 'AI' }
  // The governance rail owns three pages; off-rail panels (statistics, history)
  // keep the administrators page highlighted as the governance home.
  const activeGovernancePage: WorkspaceResourcePage = activeTab === 'chat' ? 'chat' : activeTab === 'admins' ? 'admins' : 'settings'
  const allowedGovernanceCommands: readonly UniversalCommand[] = ['create']
  const handleGovernanceCommand = (command: UniversalCommand) => {
    if (command !== 'create') return
    setActiveTab('admins')
    setIsCreateModalOpen(true)
  }

  return (
    <RoleWorkspaceShell activePage={activeGovernancePage} pages={rolePages} pageLabels={rolePageLabels} commandLabels={roleCommandLabels} onPageChange={(page) => setActiveTab(page === 'settings' ? 'interface' : page)} onCommand={handleGovernanceCommand} allowedCommands={allowedGovernanceCommands} localActionLabels={{ back: 'Назад', clear: 'Очистить', cancel: 'Отмена', confirm: 'Подтвердить', save: t.common.save }}>
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full items-center justify-end bg-transparent px-4 py-2 sm:px-6 lg:px-8" data-reference-role-actions>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold">
                AF
              </div>
              <div>
                <p className="text-lg font-bold leading-none tracking-tight text-foreground">{roleText.superAdmin}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{roleText.control}</p>
              </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label={language === 'uz' ? 'Yangilash' : 'Обновить'}
              className="h-9 w-9"
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>

            <LanguageSwitcher />

            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden h-9 md:inline-flex"
                >
                  <User className="mr-2 h-4 w-4" />
                  {adminName}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{roleText.profile}</DialogTitle>
                  <DialogDescription>{roleText.profileDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">{roleText.name}</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-email">{roleText.email}</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-password">{roleText.newPassword}</Label>
                    <Input
                      id="profile-password"
                      type="password"
                      value={profileForm.password}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, password: event.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={isSavingProfile}>
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      t.common.save
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="h-9"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t.common.logout}
            </Button>
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-8">
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Users}
              label="Middle admins"
              value={middleAdmins.length}
              detail={`${activeAdminsCount} active`}
            />
            <MetricCard
              icon={Activity}
              label="Orders observed"
              value={totalOrdersCount}
              detail={`${orderStatistics.pendingOrders} pending`}
            />
            <MetricCard
              icon={ShieldCheck}
              label="Delivery success"
              value={`${successRate}%`}
              detail={`${orderStatistics.successfulOrders} delivered`}
            />
            <MetricCard
              icon={BarChart3}
              label="Payment mix"
              value={`${orderStatistics.cardOrders}/${orderStatistics.cashOrders}`}
              detail="Card / Cash"
            />
          </section>

          <div>
          <Card className="rounded-2xl border border-border bg-card overflow-hidden">
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap gap-2" data-reference-governance-views>
                <Button type="button" variant="outline" size="sm" data-reference-governance-statistics onClick={() => setActiveTab('statistics')}>{t.admin.statistics}</Button>
                <Button type="button" variant="outline" size="sm" data-reference-governance-history onClick={() => setActiveTab('history')}>{t.admin.history}</Button>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <TabsList className="hidden">
                  <TabsTrigger value="admins" className="h-9 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-none font-semibold text-[13px]">
                    <Users className="h-4 w-4" />
                    {t.admin.admins}
                  </TabsTrigger>
                  <TabsTrigger value="interface" className="h-9 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-none font-semibold text-[13px]">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.admin.interface}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="h-9 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-none font-semibold text-[13px]">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="statistics" className="h-9 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-none font-semibold text-[13px]">
                    <BarChart3 className="h-4 w-4" />
                    {t.admin.statistics}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="h-9 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-none font-semibold text-[13px]">
                    <History className="h-4 w-4" />
                    {t.admin.history}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admins" className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex w-full flex-col gap-3 md:max-w-xl md:flex-row md:items-center">
                      <div className="relative w-full md:flex-1">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search by name or email"
                          className="h-10 pl-9"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusFilterButton
                          active={statusFilter === 'all'}
                          onClick={() => setStatusFilter('all')}
                          label="All"
                        />
                        <StatusFilterButton
                          active={statusFilter === 'active'}
                          onClick={() => setStatusFilter('active')}
                          label="Active"
                        />
                        <StatusFilterButton
                          active={statusFilter === 'inactive'}
                          onClick={() => setStatusFilter('inactive')}
                          label="Paused"
                        />
                      </div>
                    </div>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-10 rounded-md">
                          <Plus className="mr-2 h-4 w-4" />
                          Create
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{roleText.createAdmin}</DialogTitle>
                          <DialogDescription>{roleText.createDescription}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="create-admin-name">{roleText.fullName}</Label>
                            <Input
                              id="create-admin-name"
                              value={createFormData.name}
                              onChange={(event) =>
                                setCreateFormData((prev) => ({ ...prev, name: event.target.value }))
                              }
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="create-admin-email">{roleText.email}</Label>
                            <Input
                              id="create-admin-email"
                              type="email"
                              value={createFormData.email}
                              onChange={(event) =>
                                setCreateFormData((prev) => ({ ...prev, email: event.target.value }))
                              }
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="create-admin-password">{roleText.password}</Label>
                            <Input
                              id="create-admin-password"
                              type="password"
                              value={createFormData.password}
                              onChange={(event) =>
                                setCreateFormData((prev) => ({ ...prev, password: event.target.value }))
                              }
                              required
                              minLength={8}
                            />
                          </div>

                          {createError ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
                              {createError}
                            </div>
                          ) : null}

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                              {t.common.cancel}
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                              {isCreating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create admin'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {filteredAdmins.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredAdmins.map((admin) => {
                        const isBusy = mutatingAdminId === admin.id
                        return (
                          <div
                            key={admin.id}
                            className="rounded-2xl border border-border bg-card p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold">{admin.name}</p>
                                <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Created {formatShortDate(admin.createdAt)}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  'rounded-md border px-2 py-1 text-xs',
                                  admin.isActive
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-muted text-muted-foreground'
                                )}
                              >
                                {admin.isActive ? 'Active' : 'Paused'}
                              </Badge>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-4">
                              <Button
                                variant="outline"
                                className="h-9 rounded-md"
                                onClick={() => handleResetPassword(admin)}
                                disabled={isBusy}
                              >
                                <KeyRound className="mr-1.5 h-4 w-4" />
                                Password
                              </Button>

                              <Button
                                variant="outline"
                                className="h-9 rounded-md"
                                onClick={() => handleOpenEditAdmin(admin)}
                                disabled={isBusy}
                              >
                                <Pencil className="mr-1.5 h-4 w-4" />
                                Edit
                              </Button>

                              <Button
                                variant="outline"
                                className="h-9 rounded-md"
                                onClick={() => toggleAdminStatus(admin)}
                                disabled={isBusy}
                              >
                                {admin.isActive ? (
                                  <Pause className="mr-1.5 h-4 w-4" />
                                ) : (
                                  <Play className="mr-1.5 h-4 w-4" />
                                )}
                                {admin.isActive ? 'Pause' : 'Activate'}
                              </Button>

                              <Button
                                variant="outline"
                                className="h-9 rounded-md border-destructive/30 text-red-800 dark:text-red-300 hover:bg-destructive/10"
                                onClick={() => setAdminIdPendingDelete(admin.id)}
                                disabled={isBusy}
                              >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-5 py-8 text-center text-muted-foreground">
                      No admins found for the current filter.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="statistics" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Delivered" value={orderStatistics.successfulOrders} tone="emerald" />
                    <StatCard label="Failed" value={orderStatistics.failedOrders} tone="rose" />
                    <StatCard label="In Delivery" value={orderStatistics.inDeliveryOrders} tone="sky" />
                    <StatCard label="Pending" value={orderStatistics.pendingOrders} tone="amber" />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="rounded-lg border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Payment profile</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <StatRow label="Prepaid" value={orderStatistics.prepaidOrders} />
                        <StatRow label="Unpaid" value={orderStatistics.unpaidOrders} />
                        <StatRow label="Card" value={orderStatistics.cardOrders} />
                        <StatRow label="Cash" value={orderStatistics.cashOrders} />
                      </CardContent>
                    </Card>

                    <Card className="rounded-lg border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Customer cadence</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <StatRow label="Daily" value={orderStatistics.dailyCustomers} />
                        <StatRow label="Even days" value={orderStatistics.evenDayCustomers} />
                        <StatRow label="Odd days" value={orderStatistics.oddDayCustomers} />
                        <StatRow label="Special prefs" value={orderStatistics.specialPreferenceCustomers} />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="rounded-lg border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Calories mix</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <StatRow label="1200 kcal" value={orderStatistics.orders1200} />
                        <StatRow label="1600 kcal" value={orderStatistics.orders1600} />
                        <StatRow label="2000 kcal" value={orderStatistics.orders2000} />
                        <StatRow label="2500 kcal" value={orderStatistics.orders2500} />
                        <StatRow label="3000 kcal" value={orderStatistics.orders3000} />
                      </CardContent>
                    </Card>

                    <Card className="rounded-lg border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Basket size</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <StatRow label="Single item" value={orderStatistics.singleItemOrders} />
                        <StatRow label="Multiple items" value={orderStatistics.multiItemOrders} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="interface">
                  <InterfaceSettings />
                </TabsContent>

                <TabsContent value="chat">
                  <ChatTab />
                </TabsContent>

                <TabsContent value="history">
                  <HistoryTable role="SUPER_ADMIN" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open)
          if (!open) {
            setAdminIdEditing(null)
            setEditError('')
            setEditFormData(INITIAL_EDIT_FORM)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleText.editAdmin}</DialogTitle>
            <DialogDescription>{roleText.editDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-admin-name">{roleText.fullName}</Label>
              <Input
                id="edit-admin-name"
                value={editFormData.name}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-admin-email">Email</Label>
              <Input
                id="edit-admin-email"
                type="email"
                value={editFormData.email}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </div>

            {editError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
                {editError}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isUpdatingAdmin}>
                {isUpdatingAdmin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleText.newPassword}</DialogTitle>
            <DialogDescription>{roleText.passwordDescription} {selectedPasswordAdminName}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted p-4">
            <p className="break-all font-mono text-sm">{selectedPassword}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedPassword) {
                  void navigator.clipboard.writeText(selectedPassword)
                  toast.success(roleText.copy)
                }
              }}
            >
                              {roleText.copy}

            </Button>
            <Button onClick={() => setPasswordModalOpen(false)}>{roleText.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(adminIdPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setAdminIdPendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleText.deleteAdmin}</DialogTitle>
            <DialogDescription>
              This action permanently removes the selected middle admin account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminIdPendingDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAdmin}
              disabled={Boolean(mutatingAdminId)}
            >
              {mutatingAdminId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RoleWorkspaceShell>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2.5 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">{detail}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  )
}

function StatusFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-9 rounded-md px-3',
        active && 'border-primary bg-primary/10 text-foreground'
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'rose' | 'sky' | 'amber'
}) {
  const toneClass: Record<typeof tone, { text: string; dot: string }> = {
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    rose: { text: 'text-red-800 dark:text-red-300', dot: 'bg-destructive' },
    sky: { text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    amber: { text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  }

  const style = toneClass[tone]

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', style.dot)} />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={cn('mt-2 text-3xl font-bold tracking-tight', style.text)}>{value}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}
