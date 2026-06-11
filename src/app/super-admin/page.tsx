'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
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
import { cn, extractApiError, extractApiData } from '@/lib/utils'

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
  const { t } = useLanguage()
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
  const [adminName, setAdminName] = useState('Super Admin')

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
        const adminsJson = await adminsResponse.json()
        const adminsData = extractApiData<Admin[]>(adminsJson)
        setMiddleAdmins(Array.isArray(adminsData) ? adminsData : [])
      } else {
        const payload = await adminsResponse.json().catch(() => null)
        toast.error(extractApiError(payload, 'Failed to load admins'))
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setOrderStatistics(extractApiData<OrderStatistics>(statsData) || ZERO_STATS)
      } else {
        const payload = await statsResponse.json().catch(() => null)
        toast.error(extractApiError(payload, 'Failed to load statistics'))
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
        const nextName = user?.name || 'Super Admin'
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
      const data = extractApiData<{ id?: string; name?: string; email?: string; role?: string; message?: string }>(payload)
      if (!response.ok) {
        toast.error(extractApiError(payload, 'Failed to update profile'))
        return
      }

      // Profile response returns flat { id, name, email, role, message }
      if (data?.id) {
        const nextUser = { id: data.id, name: data.name, email: data.email, role: data.role }
        localStorage.setItem('user', JSON.stringify(nextUser))
        setAdminName(data.name || adminName)
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
        setCreateError(extractApiError(payload, 'Failed to create admin'))
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
        toast.error(extractApiError(payload, 'Failed to update admin status'))
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
        toast.error(extractApiError(payload, 'Failed to delete admin'))
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
        setEditError(extractApiError(payload, 'Failed to update admin'))
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
      const resetData = extractApiData<{ password: string }>(payload)

      if (!response.ok || !resetData?.password) {
        toast.error(extractApiError(payload, 'Failed to reset password'))
        return
      }

      setSelectedPassword(resetData.password)
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
      <div className="flex min-h-screen items-center justify-center bg-[#fafbfc] dark:bg-[#06060a] relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40" />
        <div className="absolute top-[-20%] left-[10%] w-[400px] h-[400px] rounded-full bg-neutral-500/[0.06] blur-[100px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-neutral-500/[0.05] blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="text-center relative z-10">
          <div className="relative mx-auto mb-4">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-neutral-800 flex items-center justify-center shadow-lg shadow-neutral-500/25 animate-pulse">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 dark:text-white/40 font-medium">{t.common.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#06060a] text-foreground relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 z-0 bg-dot-grid pointer-events-none opacity-40" />
      <div className="fixed inset-0 z-0 bg-aurora pointer-events-none opacity-50" />
      <div className="fixed top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-neutral-500/[0.05] dark:bg-neutral-500/[0.03] blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="fixed bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-neutral-500/[0.05] dark:bg-neutral-500/[0.03] blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

 <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#06060a]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white text-xs font-bold shadow-lg shadow-neutral-500/25">
                AF
              </div>
              <div>
                <p className="text-lg font-bold leading-none tracking-tight text-zinc-900 dark:text-white">Super Admin</p>
                <p className="mt-1 text-[11px] font-semibold text-zinc-400 dark:text-white/40 tracking-wider uppercase">Control layer</p>
              </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
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
                  <DialogTitle>Profile settings</DialogTitle>
                  <DialogDescription>Update your super admin identity and credentials.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-password">New password (optional)</Label>
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
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="space-y-6"
        >
          <motion.section 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              icon={Users}
              label="Middle admins"
              value={middleAdmins.length}
              detail={`${activeAdminsCount} active`}
              tone="teal"
            />
            <MetricCard
              icon={Activity}
              label="Orders observed"
              value={totalOrdersCount}
              detail={`${orderStatistics.pendingOrders} pending`}
              tone="sky"
            />
            <MetricCard
              icon={ShieldCheck}
              label="Delivery success"
              value={`${successRate}%`}
              detail={`${orderStatistics.successfulOrders} delivered`}
              tone="emerald"
            />
            <MetricCard
              icon={BarChart3}
              label="Payment mix"
              value={`${orderStatistics.cardOrders}/${orderStatistics.cashOrders}`}
              detail="Card / Cash"
              tone="amber"
            />
          </motion.section>

          <motion.div variants={{
            hidden: { opacity: 0, scale: 0.98 },
            visible: { opacity: 1, scale: 1 }
          }}>
 <Card className="rounded-2xl bg-white/80 dark:bg-white/[0.015] backdrop-blur-xl shadow-sm dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] overflow-hidden">
 <CardHeader className="bg-zinc-50/50 dark:bg-white/[0.01]">
              <CardTitle className="text-xl font-bold tracking-tight">Platform governance</CardTitle>
              <CardDescription className="text-zinc-500 dark:text-white/40">
                Manage middle admins, system visibility, communication, and audit history in one workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 p-1.5 md:grid-cols-5 bg-zinc-100/80 dark:bg-white/[0.04] rounded-xl">
                  <TabsTrigger value="admins" className="h-9 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-sm font-semibold text-[13px]">
                    <Users className="h-4 w-4" />
                    {t.admin.admins}
                  </TabsTrigger>
                  <TabsTrigger value="interface" className="h-9 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-sm font-semibold text-[13px]">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.admin.interface}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="h-9 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-sm font-semibold text-[13px]">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="statistics" className="h-9 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-sm font-semibold text-[13px]">
                    <BarChart3 className="h-4 w-4" />
                    {t.admin.statistics}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="h-9 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-sm font-semibold text-[13px]">
                    <History className="h-4 w-4" />
                    {t.admin.history}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admins" className="space-y-4">
 <div className="flex flex-col gap-3 rounded-lg p-4 md:flex-row md:items-center md:justify-between">
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
                          <DialogTitle>Create middle admin</DialogTitle>
                          <DialogDescription>
                            This account gets middle-admin dashboard access immediately.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="create-admin-name">Full name</Label>
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
                            <Label htmlFor="create-admin-email">Email</Label>
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
                            <Label htmlFor="create-admin-password">Password</Label>
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
 <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
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
 className="rounded-2xl bg-white/80 dark:bg-white/[0.02] p-5 hover:shadow-md dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] transition-all duration-300 backdrop-blur-xl"
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
 'rounded-md px-2 py-1 text-xs',
                                  admin.isActive
 ? ' bg-neutral-50 text-neutral-800'
 : ' bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
 className="h-9 rounded-md text-neutral-700 hover:bg-neutral-50"
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
 <div className="rounded-lg px-5 py-8 text-center text-muted-foreground">
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
 <Card className="rounded-lg bg-card">
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

 <Card className="rounded-lg bg-card">
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
 <Card className="rounded-lg bg-card">
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

 <Card className="rounded-lg bg-card">
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
          </motion.div>
        </motion.div>
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
            <DialogTitle>Edit admin</DialogTitle>
            <DialogDescription>Update middle admin name or email.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-admin-name">Full name</Label>
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
 <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
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
            <DialogTitle>New password</DialogTitle>
            <DialogDescription>
              Save this credential for {selectedPasswordAdminName}. The value is shown only once.
            </DialogDescription>
          </DialogHeader>
 <div className="rounded-xl bg-muted p-4">
            <p className="break-all font-mono text-sm">{selectedPassword}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedPassword) {
                  void navigator.clipboard.writeText(selectedPassword)
                  toast.success('Password copied')
                }
              }}
            >
              Copy
            </Button>
            <Button onClick={() => setPasswordModalOpen(false)}>Close</Button>
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
            <DialogTitle>Delete admin</DialogTitle>
            <DialogDescription>
              This action permanently removes the selected middle admin account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminIdPendingDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              className="bg-neutral-900 text-white hover:bg-neutral-900"
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
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string | number
  detail: string
  tone: 'teal' | 'sky' | 'emerald' | 'amber'
}) {
  const toneStyles: Record<typeof tone, { icon: string; bg: string; glow: string }> = {
 teal: { icon: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-500/[0.1] ', glow: 'shadow-neutral-500/20' },
 sky: { icon: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-500/[0.1] ', glow: 'shadow-neutral-500/20' },
 emerald: { icon: 'text-neutral-800 dark:text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-500/[0.1] ', glow: 'shadow-neutral-500/20' },
 amber: { icon: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/[0.1] ', glow: 'shadow-slate-500/20' },
  }

  const style = toneStyles[tone]

  return (
 <div className="group rounded-2xl bg-white/80 dark:bg-white/[0.02] p-5 hover:shadow-lg dark:hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.4)] transition-all duration-400 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-50/50 dark:to-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="text-xs font-semibold text-zinc-400 dark:text-white/40 tracking-wider uppercase">{label}</p>
          <p className="mt-2.5 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</p>
          <p className="mt-2 text-xs font-medium text-zinc-400 dark:text-white/35">{detail}</p>
        </div>
 <div className={cn('rounded-xl p-2.5 shadow-sm', style.bg, style.glow)}>
          <Icon className={cn('h-4.5 w-4.5', style.icon)} />
        </div>
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
 active && ' bg-primary/10 text-primary'
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
    emerald: { text: 'text-neutral-800 dark:text-neutral-400', dot: 'bg-neutral-800' },
    rose: { text: 'text-neutral-700 dark:text-neutral-400', dot: 'bg-neutral-700' },
    sky: { text: 'text-neutral-600 dark:text-neutral-400', dot: 'bg-neutral-600' },
    amber: { text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
  }

  const style = toneClass[tone]

  return (
 <div className="rounded-2xl bg-white/80 dark:bg-white/[0.02] px-5 py-4 backdrop-blur-xl hover:shadow-md dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', style.dot)} />
        <p className="text-xs font-semibold text-zinc-400 dark:text-white/40 tracking-wider uppercase">{label}</p>
      </div>
      <p className={cn('mt-2 text-3xl font-bold tracking-tight', style.text)}>{value}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
 <div className="rounded-xl bg-zinc-50/50 dark:bg-white/[0.015] px-4 py-3 hover:bg-white dark:hover:bg-white/[0.03] transition-colors duration-200">
      <p className="text-[11px] font-semibold text-zinc-400 dark:text-white/35 tracking-wider uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-800 dark:text-white/90">{value}</p>
    </div>
  )
}
