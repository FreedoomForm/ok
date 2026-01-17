'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  Package,
  Users,
  Settings,
  History,
  User,
  LogOut,
  Plus,
  Trash2,
  Pause,
  Play,
  Eye,
  EyeOff,
  FileText,
  Save,
  Filter,
  ChevronLeft,
  ChevronRight,
  Route,
  CalendarDays,
  MapPin,
  Edit,
  Globe,
  DollarSign,
  Clock,
  Truck,
  UtensilsCrossed
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { StatsCards } from '@/components/admin/StatsCards'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { HistoryTable } from '@/components/admin/HistoryTable'
import { InterfaceSettings } from '@/components/admin/InterfaceSettings'
import WebsiteBuilderPage from '@/app/middle-admin/website/page'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { UserGuide } from '@/components/UserGuide'
import { TrialStatus } from '@/components/admin/TrialStatus'
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal'
import { ChatTab } from '@/components/chat/ChatTab'
import { TodaysMenu } from '@/components/admin/TodaysMenu'
import { getDailyPrice, PLAN_TYPES } from '@/lib/menuData'

import { WarehouseTab } from '@/components/admin/WarehouseTab'
import { FinanceTab } from '@/components/admin/FinanceTab'
import { SetsTab } from '@/components/admin/SetsTab'
import { RouteOptimizeButton } from '@/components/admin/RouteOptimizeButton'

interface Admin {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  allowedTabs?: string[]
  salary?: number
}

interface Order {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
  }
  deliveryAddress: string
  latitude?: number
  longitude?: number
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  paymentStatus: string
  paymentMethod: string
  orderStatus: string
  isPrepaid: boolean
  createdAt: string
  deliveryDate?: string
  isAutoOrder?: boolean
  customerName?: string
  customerPhone?: string
  courierId?: string
  courierName?: string
}

interface Client {
  id: string
  name: string
  nickName?: string | null
  phone: string
  address: string
  calories: number
  planType: 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC'
  dailyPrice: number
  notes?: string
  specialFeatures: string
  deliveryDays: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  autoOrdersEnabled: boolean
  isActive: boolean
  createdAt: string
  deletedAt?: string
  deletedBy?: string
  defaultCourierId?: string
  defaultCourierName?: string
  googleMapsLink?: string
  latitude?: number | null
  longitude?: number | null
}

interface BinClient {
  id: string
  name: string
  phone: string
  address: string
  isActive: boolean
  deletedAt: string
  deletedBy?: string
  createdAt: string
}

interface Stats {
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

export default function MiddleAdminPage() {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState('statistics')
  const [currentDate, setCurrentDate] = useState('')
  const [lowAdmins, setLowAdmins] = useState<Admin[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [couriers, setCouriers] = useState<Admin[]>([])
  const [binClients, setBinClients] = useState<Client[]>([])
  const [binOrders, setBinOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [isCreateCourierModalOpen, setIsCreateCourierModalOpen] = useState(false)
  const [isCreateFeatureModalOpen, setIsCreateFeatureModalOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)
  const [isBulkEditOrdersModalOpen, setIsBulkEditOrdersModalOpen] = useState(false)
  const [isBulkEditClientsModalOpen, setIsBulkEditClientsModalOpen] = useState(false)
  const [bulkOrderUpdates, setBulkOrderUpdates] = useState({
    orderStatus: '',
    paymentStatus: '',
    courierId: '',
    deliveryDate: ''
  })
  const [bulkClientUpdates, setBulkClientUpdates] = useState({
    isActive: undefined as boolean | undefined,
    calories: ''
  })
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false)
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false)
  const [editAdminFormData, setEditAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LOW_ADMIN',
    isActive: true,
    allowedTabs: [] as string[],
    salary: 0
  })
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LOW_ADMIN',
    allowedTabs: [] as string[],
    salary: ''
  })
  const [courierFormData, setCourierFormData] = useState({
    name: '',
    email: '',
    password: '',
    salary: ''
  })
  const [featureFormData, setFeatureFormData] = useState({
    name: '',
    description: '',
    type: 'TEXT',
    options: ''
  })
  const [clientFormData, setClientFormData] = useState({
    name: '',
    nickName: '',
    phone: '',
    address: '',
    calories: 1200,
    planType: 'CLASSIC' as 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC',
    dailyPrice: 84000,
    notes: '',
    specialFeatures: '',
    deliveryDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    autoOrdersEnabled: true,
    isActive: true,
    defaultCourierId: '',
    googleMapsLink: '',
    latitude: null as number | null,
    longitude: null as number | null
  })
  const [orderFormData, setOrderFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryTime: '',
    quantity: 1,
    calories: 1200,
    specialFeatures: '',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    isPrepaid: false,
    selectedClientId: '',
    latitude: null as number | null,
    longitude: null as number | null,
    courierId: ''
  })
  const [parsedCoords, setParsedCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isCreatingCourier, setIsCreatingCourier] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [isCreatingFeature, setIsCreatingFeature] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [createError, setCreateError] = useState('')
  const [orderError, setOrderError] = useState('')
  const [courierFilter, setCourierFilter] = useState<string>('all')

  // Set current date on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))
  }, [])
  const [courierError, setCourierError] = useState('')
  const [featureError, setFeatureError] = useState('')
  const [clientError, setClientError] = useState('')
  const [filters, setFilters] = useState({
    successful: false,
    failed: false,
    pending: false,
    inDelivery: false,
    prepaid: false,
    paid: false,
    unpaid: false,
    card: false,
    cash: false,
    daily: false,
    evenDay: false,
    oddDay: false,
    special: false,
    calories1200: false,
    calories1600: false,
    calories2000: false,
    calories2500: false,
    calories3000: false,
    singleItem: false,
    multiItem: false,
    autoOrders: false,
    manualOrders: false
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBinClients, setSelectedBinClients] = useState<Set<string>>(new Set())

  // Add effect to reset selected clients when filter changes
  useEffect(() => {
    setSelectedClients(new Set())
  }, [clientStatusFilter])

  useEffect(() => {
    // Fetch data on initial load
    // Authentication is handled by NextAuth middleware
    fetchData()
  }, []) // Initial load

  useEffect(() => {
    // Re-fetch data when date or filters change
    if (selectedDate || filters) {
      fetchData()
    }
  }, [selectedDate, filters])

  const fetchLowAdmins = async () => {
    try {
      const response = await fetch('/api/admin/low-admins', {
        headers: {
        }
      })

      if (response.ok) {
        const adminsData = await response.json()
        setLowAdmins(adminsData)
      }
    } catch (error) {
      console.error('Error fetching low admins:', error)
    }
  }

  const fetchData = async () => {
    if (typeof window === 'undefined') return

    try {
      // Set a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      )

      // Fetch low admins
      await Promise.race([fetchLowAdmins(), timeoutPromise])

      // Fetch orders
      const ordersUrl = selectedDate
        ? `/api/orders?date=${selectedDate.toISOString().split('T')[0]}&filters=${JSON.stringify(filters)}`
        : `/api/orders?filters=${JSON.stringify(filters)}`

      const headers = {
      }

      const fetchPromise = Promise.all([
        fetch(ordersUrl, { headers }),
        fetch('/api/admin/clients', { headers }),
        fetch('/api/admin/statistics', { headers }),
        fetch('/api/admin/couriers', { headers })
      ])

      const [ordersRes, clientsRes, statsRes, couriersRes] = await Promise.race([fetchPromise, timeoutPromise]) as [Response, Response, Response, Response]

      // Handle 401 Unauthorized
      if (ordersRes.status === 401 || clientsRes.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData)
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (couriersRes.ok) {
        const couriersData = await couriersRes.json()
        setCouriers(couriersData)
      }

      // Fetch bin clients
      await fetchBinClients()

      // Fetch bin orders
      await fetchBinOrders()
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Ошибка загрузки данных', {
        description: error instanceof Error ? error.message : 'Проверьте соединение с интернетом'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBinOrders = async () => {
    try {
      const response = await fetch('/api/orders?deletedOnly=true', {
        headers: {
        }
      })
      if (response.ok) {
        const data = await response.json()
        setBinOrders(data)
      }
    } catch (error) {
      console.error('Error fetching bin orders:', error)
    }
  }

  const fetchBinClients = async () => {
    try {
      const response = await fetch('/api/admin/clients/bin', {
        headers: {
        }
      })
      if (response.ok) {
        const data = await response.json()
        setBinClients(data)
      }
    } catch (error) {
      console.error('Error fetching bin clients:', error)
    }
  }

  const handleLogout = async () => {
    // Clear localStorage (for backward compatibility)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    // Sign out from NextAuth (clears session cookies)
    await signOut({ callbackUrl: '/', redirect: true })
  }

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const handleSelectAllOrders = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map(order => order.id)))
    }
  }

  const handleDeleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Пожалуйста, выберите заказы для удаления')
      return
    }

    const confirmMessage = `Вы уверены, что хотите удалить ${selectedOrders.size} заказ(ов)?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/orders/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Успешно удалено ${data.deletedCount} заказ(ов)`)
        setSelectedOrders(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка удаления заказов'}`)
      }
    } catch (error) {
      console.error('Delete orders error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handlePermanentDeleteOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Пожалуйста, выберите заказы для удаления')
      return
    }

    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы уверены, что хотите НАВСЕГДА удалить ${selectedOrders.size} заказ(ов)?\n\nЭто действие НЕЛЬЗЯ отменить!`
    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm('Подтвердите еще раз: вы действительно хотите удалить эти заказы навсегда?')
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/orders/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Успешно удалено навсегда ${data.deletedCount} заказ(ов)`)
        setSelectedOrders(new Set())
        fetchBinOrders()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка удаления заказов'}`)
      }
    } catch (error) {
      console.error('Permanent delete orders error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleRestoreSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Пожалуйста, выберите заказы для восстановления')
      return
    }

    if (!confirm(`Вы уверены, что хотите восстановить ${selectedOrders.size} заказ(ов)?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/orders/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `Успешно восстановлено ${data.updatedCount} заказ(ов)`)
        setSelectedOrders(new Set())
        fetchBinOrders()
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка восстановления заказов'}`)
      }
    } catch (error) {
      console.error('Restore orders error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleSelectAllBinOrders = () => {
    if (selectedOrders.size === binOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(binOrders.map(order => order.id)))
    }
  }

  const handlePermanentDeleteClients = async () => {
    if (selectedBinClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для удаления')
      return
    }

    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы уверены, что хотите НАВСЕГДА удалить ${selectedBinClients.size} клиент(ов)?\n\nВместе с клиентами будут удалены ВСЕ их заказы и история.\n\nЭто действие НЕЛЬЗЯ отменить!`
    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm('Подтвердите еще раз: вы действительно хотите удалить этих клиентов навсегда?')
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientIds: Array.from(selectedBinClients) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `Успешно удалено навсегда ${data.deletedClients} клиент(ов)`)
        setSelectedBinClients(new Set())
        fetchBinClients()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка удаления клиентов'}`)
      }
    } catch (error) {
      console.error('Permanent delete clients error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError('')

    try {
      const response = await fetch('/api/admin/low-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createFormData)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateModalOpen(false)
        setCreateFormData({ name: '', email: '', password: '', role: 'LOW_ADMIN', allowedTabs: [] })
        fetchData()
        toast.success('Администратор успешно создан')
      } else {
        setCreateError(data.error || 'Ошибка создания администратора')
      }
    } catch (error) {
      setCreateError('Ошибка соединения с сервером')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setEditAdminFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      role: admin.role,
      isActive: admin.isActive,
      allowedTabs: admin.allowedTabs || [],
      salary: admin.salary || 0
    })
    setIsEditAdminModalOpen(true)
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return

    try {
      const response = await fetch(`/api/admin/low-admins/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editAdminFormData.name,
          email: editAdminFormData.email,
          role: editAdminFormData.role,
          isActive: editAdminFormData.isActive,
          allowedTabs: editAdminFormData.allowedTabs,
          salary: editAdminFormData.salary,
          ...(editAdminFormData.password ? { password: editAdminFormData.password } : {})
        })
      })

      if (response.ok) {
        setIsEditAdminModalOpen(false)
        setEditingAdmin(null)
        fetchData()
        toast.success('Администратор успешно обновлен')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка обновления администратора', {
          description: data.details || undefined
        })
      }
    } catch (error) {
      console.error('Error updating admin:', error)
      toast.error('Ошибка обновления администратора')
    }
  }

  const parseGoogleMapsUrl = async (url: string): Promise<string | null> => {
    if (!url) return null

    let finalUrl = url

    // Handle short links
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const response = await fetch(`/api/admin/expand-url?url=${encodeURIComponent(url)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.expandedUrl) {
            finalUrl = data.expandedUrl
          }
        }
      } catch (error) {
        console.error('Error expanding URL:', error)
      }
    }

    try {
      // 1. Format: @41.311081,69.240562
      const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (atMatch) {
        return `${atMatch[1]}, ${atMatch[2]}`
      }

      // 2. Format: q=41.311081,69.240562
      const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (qMatch) {
        return `${qMatch[1]}, ${qMatch[2]}`
      }

      // 3. Format: !3d41.311081!4d69.240562
      const pbMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
      if (pbMatch) {
        return `${pbMatch[1]}, ${pbMatch[2]}`
      }

      // 4. Format: ll=41.311081,69.240562
      const llMatch = finalUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (llMatch) {
        return `${llMatch[1]}, ${llMatch[2]}`
      }

      // 5. Format: search/41.311081,69.240562
      const searchMatch = finalUrl.match(/search\/(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (searchMatch) {
        return `${searchMatch[1]}, ${searchMatch[2]}`
      }

      return null
    } catch (error) {
      console.error('Error parsing Google Maps URL:', error)
      return null
    }
  }

  const handleAddressChange = async (value: string) => {
    setOrderFormData(prev => ({ ...prev, deliveryAddress: value }))

    // Парсим координаты в реальном времени
    const parsed = await parseGoogleMapsUrl(value)
    if (parsed && parsed.includes(',')) {
      const coords = parsed.split(',')
      const lat = parseFloat(coords[0].trim())
      const lng = parseFloat(coords[1].trim())

      if (!isNaN(lat) && !isNaN(lng)) {
        setParsedCoords({ lat, lng })
      } else {
        setParsedCoords(null)
      }
    } else {
      setParsedCoords(null)
    }
  }

  const handleClientAddressChange = async (value: string) => {
    setClientFormData(prev => ({ ...prev, googleMapsLink: value }))

    if (!value) {
      setClientFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }))
      return
    }

    const parsed = await parseGoogleMapsUrl(value)
    if (parsed && parsed.includes(',')) {
      const coords = parsed.split(',')
      const lat = parseFloat(coords[0].trim())
      const lng = parseFloat(coords[1].trim())

      if (!isNaN(lat) && !isNaN(lng)) {
        setClientFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }))
      }
    } else {
      // Optional: Clear coordinates if link is invalid? 
      // Or keep previous valid ones? 
      // Let's clear them to avoid confusion if the user thinks they changed the link but the coords remained old.
      setClientFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }))
    }
  }



  const handleDeleteSelectedClients = async () => {
    if (selectedClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для удаления')
      return
    }

    const selectedClientsList = Array.from(selectedClients).map(id =>
      clients.find(c => c.id === id)?.name || 'Неизвестный клиент'
    ).join(', ')

    const confirmMessage = `Вы уверены, что хотите удалить следующих клиентов:\n\n${selectedClientsList}\n\nВсе автоматически созданные заказы этих клиентов за последние 30 дней также будут удалены.\n\nЭто действие нельзя отменить.`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          deleteOrders: true,
          daysBack: 30
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Успешно удалено:\n- ${data.deletedClients} клиент(ов)\n- ${data.deletedOrders} заказ(ов)`)
        setSelectedClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка удаления клиентов'}`)
      }
    } catch (error) {
      console.error('Delete clients error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId && clientId !== "manual") {
      const selectedClient = clients.find(client => client.id === clientId)
      if (selectedClient) {
        setOrderFormData(prev => ({
          ...prev,
          selectedClientId: clientId,
          customerName: selectedClient.name,
          customerPhone: selectedClient.phone,
          deliveryAddress: selectedClient.address,
          calories: selectedClient.calories,
          specialFeatures: selectedClient.specialFeatures
        }))

        // Также парсим координаты из адреса клиента
        parseGoogleMapsUrl(selectedClient.address).then(parsed => {
          if (parsed && parsed.includes(',')) {
            const coords = parsed.split(',')
            const lat = parseFloat(coords[0].trim())
            const lng = parseFloat(coords[1].trim())

            if (!isNaN(lat) && !isNaN(lng)) {
              setParsedCoords({ lat, lng })
            } else {
              setParsedCoords(null)
            }
          } else {
            setParsedCoords(null)
          }
        })
      }
    } else {
      // Если клиент не выбран или выбран ручной ввод, очищаем поля но оставляем значения по умолчанию
      setOrderFormData(prev => ({
        ...prev,
        selectedClientId: clientId === "manual" ? "manual" : '',
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        calories: 1200,
        specialFeatures: ''
      }))
      setParsedCoords(null)
    }
  }



  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingOrder(true)
    setOrderError('')

    try {
      // Parse address to extract coordinates from Google Maps link
      const parsedCoordinates = await parseGoogleMapsUrl(orderFormData.deliveryAddress)

      // Extract coordinates if present
      let latitude: number | null = null
      let longitude: number | null = null

      if (parsedCoordinates && parsedCoordinates.includes(',')) {
        const coords = parsedCoordinates.split(',')
        const lat = parseFloat(coords[0].trim())
        const lng = parseFloat(coords[1].trim())

        if (!isNaN(lat) && !isNaN(lng)) {
          latitude = lat
          longitude = lng
        }
      }

      // Add coordinates and date to order data, but keep original address
      const orderDataWithCoords = {
        ...orderFormData,
        // Keep the original deliveryAddress, don't overwrite with coordinates
        latitude,
        longitude,
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : null
      }

      let response;
      if (editingOrderId) {
        // Update existing order
        // We need to use a different endpoint or method for full update
        // Currently we only have PATCH for status/courier actions
        // Let's assume we can use the same POST endpoint but with an ID or a new PUT endpoint
        // But bulk update is limited.
        // Let's use a new action 'update_details' on the [id] route or create a new route.
        // For now, let's use the [id] route with a custom action.
        response = await fetch(`/api/orders/${editingOrderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_details',
            ...orderDataWithCoords
          })
        })
      } else {
        // Create new order
        response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderDataWithCoords)
        })
      }

      const data = await response.json()

      if (response.ok) {
        setIsCreateOrderModalOpen(false)
        setParsedCoords(null)
        setOrderFormData({
          customerName: '',
          customerPhone: '',
          deliveryAddress: '',
          deliveryTime: '',
          quantity: 1,
          calories: 1200,
          specialFeatures: '',
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
          isPrepaid: false,
          selectedClientId: '',
          latitude: null,
          longitude: null,
          courierId: ''
        })
        setEditingOrderId(null)
        fetchData()
      } else {
        setOrderError(data.error || 'Ошибка сохранения заказа')
      }
    } catch (error) {
      setOrderError('Ошибка соединения с сервером')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id)
    setOrderFormData({
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      deliveryAddress: order.deliveryAddress,
      deliveryTime: order.deliveryTime,
      quantity: order.quantity,
      calories: order.calories,
      specialFeatures: order.specialFeatures || '',
      paymentStatus: order.paymentStatus as string,
      paymentMethod: order.paymentMethod as string,
      isPrepaid: order.isPrepaid,
      selectedClientId: '', // We don't link back to client selection for now to avoid overwriting
      latitude: order.latitude || null,
      longitude: order.longitude || null,
      courierId: order.courierId || ''
    })
    setIsCreateOrderModalOpen(true)
  }

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingCourier(true)
    setCourierError('')

    try {
      const response = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...courierFormData,
          role: 'COURIER'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateCourierModalOpen(false)
        setCourierFormData({ name: '', email: '', password: '' })
        fetchData()
        toast.success('Курьер успешно создан')
      } else {
        setCourierError(data.error || 'Ошибка создания курьера')
      }
    } catch (error) {
      setCourierError('Ошибка соединения с сервером')
    } finally {
      setIsCreatingCourier(false)
    }
  }

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingFeature(true)
    setFeatureError('')

    try {
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(featureFormData)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateFeatureModalOpen(false)
        setFeatureFormData({
          name: '',
          description: '',
          type: 'TEXT',
          options: ''
        })
        // Show success message or refresh data
      } else {
        setFeatureError(data.error || 'Ошибка создания особенности')
      }
    } catch (error) {
      setFeatureError('Ошибка соединения с сервером')
    } finally {
      setIsCreatingFeature(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingClient(true)
    setClientError('')

    try {
      const url = editingClientId
        ? `/api/admin/clients/${editingClientId}`
        : '/api/admin/clients'

      const method = editingClientId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientFormData)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateClientModalOpen(false)
        setClientFormData({
          name: '',
          nickName: '',
          phone: '',
          address: '',
          calories: 1200,
          planType: 'CLASSIC',
          dailyPrice: 84000,
          notes: '',
          specialFeatures: '',
          deliveryDays: {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          },
          autoOrdersEnabled: true,
          isActive: true,
          defaultCourierId: '',
          googleMapsLink: '',
          latitude: null,
          longitude: null
        })
        setEditingClientId(null)

        // Show success message
        const action = editingClientId ? 'обновлен' : 'создан'
        let message = `Клиент "${data.client?.name || clientFormData.name}" успешно ${action}!`
        let description = ''
        if (!editingClientId && data.autoOrdersCreated && data.autoOrdersCreated > 0) {
          description = `Автоматически создано заказов: ${data.autoOrdersCreated} (на следующие 30 дней)`
        }

        toast.success(message, { description })
        fetchData()
      } else {
        const errorMessage = data.error || `Ошибка ${editingClientId ? 'обновления' : 'создания'} клиента`
        const errorDetails = data.details ? `\n${data.details}` : ''
        setClientError(`${errorMessage}${errorDetails}`)
        toast.error(errorMessage, { description: data.details })
      }
    } catch (error) {
      setClientError('Ошибка соединения с сервером')
    } finally {
      setIsCreatingClient(false)
    }
  }



  // Mobile View Helper - Removed duplicates from here



  const handleEditClient = (client: Client) => {
    setClientFormData({
      name: client.name,
      nickName: client.nickName || '',
      phone: client.phone,
      address: client.address,
      calories: client.calories,
      planType: client.planType || 'CLASSIC',
      dailyPrice: client.dailyPrice || 84000,
      notes: client.notes || '',
      specialFeatures: client.specialFeatures || '',
      deliveryDays: client.deliveryDays || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      autoOrdersEnabled: client.autoOrdersEnabled,
      isActive: client.isActive,
      defaultCourierId: client.defaultCourierId || '',
      googleMapsLink: client.googleMapsLink || '',
      latitude: client.latitude || null,
      longitude: client.longitude || null
    })
    setEditingClientId(client.id)
    setIsCreateClientModalOpen(true)
  }

  const handleToggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/clients/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientIds: [clientId], isActive: !currentStatus })
      })

      if (response.ok) {
        toast.success(`Клиент ${!currentStatus ? 'активирован' : 'приостановлен'}`)
        fetchData()
      } else {
        toast.error('Не удалось изменить статус клиента')
      }
    } catch (error) {
      console.error('Error toggling client status:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
        }
      })

      if (response.ok) {
        fetchData()
      } else {
        const data = await response.json()
        console.error('Error deleting client:', data.error)
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  const handleToggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handlePauseSelectedClients = async () => {
    if (selectedClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для приостановки')
      return
    }

    const selectedClientsList = Array.from(selectedClients).map(id =>
      clients.find(c => c.id === id)?.name || 'Неизвестный клиент'
    ).join(', ')

    const confirmMessage = `Вы уверены, что хотите приостановить следующих клиентов:\n\n${selectedClientsList}\n\nПриостановленные клиенты не будут получать автоматические заказы.`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/toggle-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          isActive: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Успешно приостановлено клиентов: ${data.updatedCount}`)
        setSelectedClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка приостановки клиентов'}`)
      }
    } catch (error) {
      console.error('Error pausing clients:', error)
      toast.error('Ошибка соединения с сервером. Пожалуйста, попробуйте еще раз.')
    }
  }

  const handleResumeSelectedClients = async () => {
    if (selectedClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для возобновления')
      return
    }

    const selectedClientsList = Array.from(selectedClients).map(id =>
      clients.find(c => c.id === id)?.name || 'Неизвестный клиент'
    ).join(', ')

    const confirmMessage = `Вы уверены, что хотите возобновить следующих клиентов:\n\n${selectedClientsList}\n\nВозобновленные клиенты снова начнут получать автоматические заказы.`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/toggle-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          isActive: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Успешно возобновлено клиентов: ${data.updatedCount}`)
        setSelectedClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка возобновления клиентов'}`)
      }
    } catch (error) {
      console.error('Error resuming clients:', error)
      toast.error('Ошибка соединения с сервером. Пожалуйста, попробуйте еще раз.')
    }
  }

  const handleBulkUpdateOrders = async () => {
    if (selectedOrders.size === 0) return
    setIsUpdatingBulk(true)

    try {
      const updates: any = {}
      if (bulkOrderUpdates.orderStatus) updates.orderStatus = bulkOrderUpdates.orderStatus
      if (bulkOrderUpdates.paymentStatus) updates.paymentStatus = bulkOrderUpdates.paymentStatus
      if (bulkOrderUpdates.courierId) updates.courierId = bulkOrderUpdates.courierId
      if (bulkOrderUpdates.deliveryDate) updates.deliveryDate = bulkOrderUpdates.deliveryDate

      const response = await fetch('/api/admin/orders/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          updates
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Обновлено заказов: ${data.updatedCount}`)
        setIsBulkEditOrdersModalOpen(false)
        setSelectedOrders(new Set())
        setBulkOrderUpdates({
          orderStatus: '',
          paymentStatus: '',
          courierId: '',
          deliveryDate: ''
        })
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка обновления заказов', {
          description: data.details || undefined
        })
      }
    } catch (error) {
      console.error('Error bulk updating orders:', error)
      toast.error('Ошибка соединения с сервером')
    } finally {
      setIsUpdatingBulk(false)
    }
  }



  const handleBulkUpdateClients = async () => {
    if (selectedClients.size === 0) return
    setIsUpdatingBulk(true)

    try {
      const updates: any = {}
      if (bulkClientUpdates.isActive !== undefined) updates.isActive = bulkClientUpdates.isActive
      if (bulkClientUpdates.calories) updates.calories = bulkClientUpdates.calories

      const response = await fetch('/api/admin/clients/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          updates
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Обновлено клиентов: ${data.updatedCount}`)
        setIsBulkEditClientsModalOpen(false)
        setSelectedClients(new Set())
        setBulkClientUpdates({
          isActive: undefined,
          calories: ''
        })
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка обновления клиентов')
      }
    } catch (error) {
      console.error('Error bulk updating clients:', error)
      toast.error('Ошибка соединения с сервером')
    } finally {
      setIsUpdatingBulk(false)
    }
  }

  const handleRestoreSelectedClients = async () => {
    if (selectedBinClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для восстановления')
      return
    }

    const selectedClientsList = Array.from(selectedBinClients).map(id =>
      binClients.find(c => c.id === id)?.name || 'Неизвестный клиент'
    ).join(', ')

    const hasActiveClients = binClients.some(c => selectedBinClients.has(c.id) && c.isActive)
    const confirmMessage = `Вы уверены, что хотите восстановить следующих клиентов:\n\n${selectedClientsList}\n\n${hasActiveClients ? 'Автоматические заказы будут созданы для активных клиентов.' : ''}`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedBinClients)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `Успешно восстановлено: ${data.restoredClients} клиентов`)
        setSelectedBinClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка восстановления клиентов'}`)
      }
    } catch (error) {
      console.error('Restore clients error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handlePermanentDeleteSelected = async () => {
    if (selectedBinClients.size === 0) {
      toast.error('Пожалуйста, выберите клиентов для окончательного удаления')
      return
    }

    const selectedClientsList = Array.from(selectedBinClients).map(id =>
      binClients.find(c => c.id === id)?.name || 'Неизвестный клиент'
    ).join(', ')

    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы уверены, что хотите НАВСЕГДА удалить следующих клиентов:\n\n${selectedClientsList}\n\nВсе данные и заказы этих клиентов будут удалены безвозвратно.\n\nЭто действие НЕЛЬЗЯ отменить!`

    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm('Подтвердите еще раз: вы действительно хотите удалить навсегда?')
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedBinClients)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `Успешно удалено навсегда: ${data.deletedClients} клиентов`)
        setSelectedBinClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка удаления клиентов'}`)
      }
    } catch (error) {
      console.error('Permanent delete error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleRunAutoOrders = async () => {
    try {
      toast.info('Запуск создания автоматических заказов...')

      const response = await fetch('/api/admin/auto-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetDate: new Date() })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `Создано ${data.ordersCreated} автоматических заказов`)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(`Ошибка: ${data.error || 'Ошибка создания заказов'}`)
      }
    } catch (error) {
      console.error('Run auto orders error:', error)
      toast.error('Ошибка соединения с сервером')
    }
  }

  const handleToggleBinClientSelection = (clientId: string) => {
    setSelectedBinClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleDeliveryDayChange = (day: string, checked: boolean) => {
    setClientFormData(prev => ({
      ...prev,
      deliveryDays: {
        ...prev.deliveryDays,
        [day]: checked
      }
    }))
  }

  const handleOpenOrder = (orderId: string) => {
    // Find the order
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setSelectedOrder(order)
      setIsOrderDetailsModalOpen(true)
    }
  }

  const handleOpenRoute = (orderId: string) => {
    // Find the order
    const order = orders.find(o => o.id === orderId)
    if (order) {
      // For now, we'll open Google Maps with the address
      // In a real app, this could integrate with a mapping service
      const encodedAddress = encodeURIComponent(order.deliveryAddress)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
    }
  }

  const handleGetAdminRoute = (order: Order) => {
    try {
      let destination = order.deliveryAddress

      // Если есть координаты, используем их для точной навигации
      if (order.latitude && order.longitude) {
        destination = `${order.latitude},${order.longitude}`
      }

      // Создаем ссылку для навигации от текущего местоположения к точке назначения
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destination}&travelmode=driving&dir_action=navigate`

      // Открываем ссылку в новой вкладке
      window.open(navigationUrl, '_blank')
    } catch (error) {
      console.error('Error getting route:', error)
    }
  }

  const getDateRange = () => {
    const dates: Date[] = []
    const today = selectedDate || new Date()

    for (let i = -4; i <= 5; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-500'
      case 'IN_DELIVERY': return 'bg-yellow-500'
      case 'FAILED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Доставлен'
      case 'IN_DELIVERY': return 'В доставке'
      case 'FAILED': return 'Не доставлен'
      default: return 'Ожидает'
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
              <h1 className="text-xl font-semibold text-slate-900">{t.admin.dashboard}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                {currentDate || ' '}
              </div>
              <LanguageSwitcher />
              <UserGuide guides={[
                {
                  title: t.admin.createOrder,
                  description: t.admin.manageOrdersDesc, // Using generic desc as placeholder or need specific key
                  buttonName: "+ " + t.admin.createOrder,
                  icon: <Plus className="w-5 h-5 text-primary" />
                },
                {
                  title: t.admin.createClient,
                  description: t.admin.manageClientsDesc,
                  buttonName: "+ " + t.admin.createClient,
                  icon: <User className="w-5 h-5 text-primary" />
                },
                {
                  title: t.admin.createAutoOrders,
                  description: t.admin.manageOrdersDesc,
                  buttonName: t.admin.auto,
                  icon: <Route className="w-5 h-5 text-primary" />
                },
                {
                  title: t.admin.delete,
                  description: t.admin.bin,
                  buttonName: t.admin.bin,
                  icon: <Trash2 className="w-5 h-5 text-primary" />
                },
                {
                  title: t.admin.history,
                  description: t.admin.history,
                  buttonName: t.admin.history,
                  icon: <History className="w-5 h-5 text-primary" />
                }
              ]} />
              <TrialStatus compact />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t.common.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {t.admin.dashboard}
          </h1>
          <p className="text-muted-foreground">
            {t.admin.dashboardSubtitle}
          </p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9 h-auto gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-xl">
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Package className="w-4 h-4 mr-2" />
              {t.admin.orders}
            </TabsTrigger>
            <TabsTrigger
              value="clients"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Users className="w-4 h-4 mr-2" />
              {t.admin.clients}
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Users className="w-4 h-4 mr-2" />
              {t.admin.admins}
            </TabsTrigger>
            <TabsTrigger
              value="bin"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.admin.bin}
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t.admin.statistics}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <History className="w-4 h-4 mr-2" />
              {t.admin.history}
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <User className="w-4 h-4 mr-2" />
              {t.common.profile}
            </TabsTrigger>
            <TabsTrigger
              value="warehouse"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Package className="w-4 h-4 mr-2" />
              {t.warehouse.title}
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {t.finance.title}
            </TabsTrigger>
            <TabsTrigger
              value="sets"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Сеты
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            {/* Order Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.successful}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.successfulOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Доставлено</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.failed}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.failedOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Отменено</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.inDelivery}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.inDeliveryOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">В процессе</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.pending}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.pendingOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">В очереди</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.prepaid}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.prepaidOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Оплачено</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.unpaid}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.unpaidOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Оплата при получении</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.card}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.cardOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Онлайн оплата</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.cash}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.cashOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">При получении</p>
                </CardContent>
              </Card>
            </div>

            {/* Customer Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.daily}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.dailyCustomers || 0}
                  </div>
                  <p className="text-xs text-slate-500">Каждый день</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.evenDay}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats?.evenDayCustomers || 0}
                  </div>
                  <p className="text-xs text-slate-500">По четным дням</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.oddDay}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600">
                    {stats?.oddDayCustomers || 0}
                  </div>
                  <p className="text-xs text-slate-500">По нечетным дням</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.special}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.specialPreferenceCustomers || 0}
                  </div>
                  <p className="text-xs text-slate-500">С особенностями</p>
                </CardContent>
              </Card>
            </div>

            {/* Calories Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.lowCal}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.orders1200 || 0}
                  </div>
                  <p className="text-xs text-slate-500">Низкокалорийные</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.standard}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.orders1600 || 0}
                  </div>
                  <p className="text-xs text-slate-500">Стандарт</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.medium}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.orders2000 || 0}
                  </div>
                  <p className="text-xs text-slate-500">Средние</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.high}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.orders2500 || 0}
                  </div>
                  <p className="text-xs text-slate-500">Сытные</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.max}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.orders3000 || 0}
                  </div>
                  <p className="text-xs text-slate-500">Максимальные</p>
                </CardContent>
              </Card>
            </div>

            {/* Item Count Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.single}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats?.singleItemOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">1 порция</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.admin.stats.multi}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.multiItemOrders || 0}
                  </div>
                  <p className="text-xs text-slate-500">Два и более рационов</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>



          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="glass-card border-none">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold">{t.admin.manageOrders}</CardTitle>
                    <CardDescription>
                      {t.admin.manageOrdersDesc}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setIsCreateOrderModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заказ
                  </Button>
                  <RouteOptimizeButton
                    orders={orders}
                    onOptimized={(orderedIds) => {
                      // Reorder the orders array based on optimized IDs
                      const orderedOrders = orderedIds
                        .map(id => orders.find(o => o.id === id))
                        .filter(Boolean) as typeof orders;
                      setOrders(orderedOrders);
                    }}
                    variant="outline"
                    size="sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => setIsBulkEditOrdersModalOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать ({selectedOrders.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteSelectedOrders}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить выбранные ({selectedOrders.size})
                  </Button>
                </div>
                {/* Date Selector */}
                <div className="flex items-center justify-center mb-6 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className={!selectedDate ? "bg-primary text-primary-foreground" : ""}
                  >
                    Все заказы
                  </Button>
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex space-x-1">
                    {getDateRange().map((date, index) => (
                      <Button
                        key={index}
                        variant={selectedDate && date.toDateString() === selectedDate.toDateString() ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10 p-0"
                        onClick={() => setSelectedDate(date)}
                      >
                        {date.getDate()}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selected Date Indicator */}
                {
                  selectedDate && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 text-center">
                        📅 Показаны заказы за {selectedDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )
                }

                {/* Filters Panel */}
                {
                  showFilters && (
                    <div className="mb-6 p-4 border rounded-lg bg-slate-50">
                      <h3 className="font-medium mb-4">{t.admin.filters}</h3>

                      <div className="space-y-4">
                        {/* Delivery Status */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-slate-700">{t.admin.filterGroups.deliveryStatus}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.pending}
                                onChange={(e) => setFilters({ ...filters, pending: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.pending} (#facc15)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.inDelivery}
                                onChange={(e) => setFilters({ ...filters, inDelivery: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.inDelivery} (#3b82f6)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.successful}
                                onChange={(e) => setFilters({ ...filters, successful: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.delivered} (#22c55e)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.failed}
                                onChange={(e) => setFilters({ ...filters, failed: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.failed} (#ef4444)</span>
                            </label>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-slate-700">{t.admin.filterGroups.payment}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.paid}
                                onChange={(e) => setFilters({ ...filters, paid: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.paid}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.unpaid}
                                onChange={(e) => setFilters({ ...filters, unpaid: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.unpaid}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.prepaid}
                                onChange={(e) => setFilters({ ...filters, prepaid: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.prepaid} (⭐)</span>
                            </label>
                            <div className="hidden md:block"></div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.cash}
                                onChange={(e) => setFilters({ ...filters, cash: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.cash}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.card}
                                onChange={(e) => setFilters({ ...filters, card: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.card}</span>
                            </label>
                          </div>
                        </div>

                        {/* Calorie Groups */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-slate-700">{t.admin.filterGroups.calories}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.calories1200}
                                onChange={(e) => setFilters({ ...filters, calories1200: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">1200</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.calories1600}
                                onChange={(e) => setFilters({ ...filters, calories1600: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">1600</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.calories2000}
                                onChange={(e) => setFilters({ ...filters, calories2000: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">2000</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.calories2500}
                                onChange={(e) => setFilters({ ...filters, calories2500: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">2500</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.calories3000}
                                onChange={(e) => setFilters({ ...filters, calories3000: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">3000</span>
                            </label>
                          </div>
                        </div>

                        {/* Other filters */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-slate-700">{t.admin.filterGroups.other}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.autoOrders}
                                onChange={(e) => setFilters({ ...filters, autoOrders: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.auto}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.manualOrders}
                                onChange={(e) => setFilters({ ...filters, manualOrders: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.manual}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.singleItem}
                                onChange={(e) => setFilters({ ...filters, singleItem: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.singlePortion}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filters.multiItem}
                                onChange={(e) => setFilters({ ...filters, multiItem: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">{t.admin.filterGroups.multiPortion}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }


                {/* Today's Menu Display */}
                <TodaysMenu className="mb-6" />

                {/* Order Search */}
                <div className="mb-4 relative">
                  <Input
                    placeholder="Поиск по имени, адресу или номеру заказа..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Filter className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Orders Table */}
                <div className="rounded-md border">
                  <OrdersTable
                    orders={orders.filter(order => {
                      const searchLower = searchTerm.toLowerCase()
                      return (
                        order.customer?.name.toLowerCase().includes(searchLower) ||
                        order.customerName?.toLowerCase().includes(searchLower) ||
                        order.deliveryAddress.toLowerCase().includes(searchLower) ||
                        order.orderNumber.toString().includes(searchLower)
                      )
                    })}
                    selectedOrders={selectedOrders}
                    onSelectOrder={handleOrderSelect}
                    onSelectAll={handleSelectAllOrders}
                    onDeleteSelected={handleDeleteSelectedOrders}
                    onViewOrder={(order) => {
                      setSelectedOrder(order)
                      setIsOrderDetailsModalOpen(true)
                    }}
                    onEditOrder={handleEditOrder}
                  />
                </div>

                {/* Table Actions */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex space-x-2">
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card className="glass-card border-none">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t.admin.manageClients}</CardTitle>
                    <CardDescription>
                      {t.admin.manageClientsDesc}
                      {clientStatusFilter !== 'all' && (
                        <span className="ml-2 text-sm">
                          (Показано: {clients.filter(client => {
                            if (clientStatusFilter === 'active') return client.isActive
                            if (clientStatusFilter === 'inactive') return !client.isActive
                            return true
                          }).length} из {clients.length})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={clientStatusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setClientStatusFilter(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Фильтр статуса" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все клиенты</SelectItem>
                        <SelectItem value="active">Только активные</SelectItem>
                        <SelectItem value="inactive">Только приостановленные</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('bin')}
                    >
                      🗑️ Корзина
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRunAutoOrders}
                    >
                      🤖 Создать авто-заказы
                    </Button>
                    <Dialog open={isCreateClientModalOpen} onOpenChange={setIsCreateClientModalOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Создать клиента
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingClientId ? 'Редактировать Клиента' : 'Создать Клиента'}</DialogTitle>
                          <DialogDescription>
                            {editingClientId ? 'Измените данные клиента' : 'Создайте нового клиента в системе'}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateClient}>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientName" className="text-right">
                                Имя
                              </Label>
                              <Input
                                id="clientName"
                                value={clientFormData.name}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientNickName" className="text-right">
                                Никнейм
                              </Label>
                              <Input
                                id="clientNickName"
                                value={clientFormData.nickName || ''}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, nickName: e.target.value }))}
                                className="col-span-3"
                                placeholder="Например: Офис, Дом... (необязательно)"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPhone" className="text-right">
                                Телефон
                              </Label>
                              <div className="col-span-3">
                                <Input
                                  id="clientPhone"
                                  type="tel"
                                  placeholder="+998 XX XXX XX XX"
                                  value={clientFormData.phone}
                                  onChange={(e) => setClientFormData(prev => ({ ...prev, phone: e.target.value }))}
                                  required
                                />
                                <p className="text-xs text-muted-foreground mt-1">Формат: +998 XX XXX XX XX</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientAddress" className="text-right">
                                Адрес
                              </Label>
                              <Input
                                id="clientAddress"
                                value={clientFormData.address}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="googleMapsLink" className="text-right">
                                Ссылка на карту
                              </Label>

                              <Input
                                id="googleMapsLink"
                                placeholder="https://maps.google.com/..."
                                value={clientFormData.googleMapsLink || ''}
                                onChange={(e) => handleClientAddressChange(e.target.value)}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPlanType" className="text-right">
                                Тариф
                              </Label>
                              <select
                                id="clientPlanType"
                                value={clientFormData.planType}
                                onChange={(e) => {
                                  const val = e.target.value as any
                                  setClientFormData(prev => ({
                                    ...prev,
                                    planType: val,
                                    dailyPrice: getDailyPrice(val, prev.calories)
                                  }))
                                }}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {Object.entries(PLAN_TYPES).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientCalories" className="text-right">
                                Калории
                              </Label>
                              <select
                                id="clientCalories"
                                value={clientFormData.calories}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value)
                                  setClientFormData(prev => ({
                                    ...prev,
                                    calories: val,
                                    dailyPrice: getDailyPrice(prev.planType, val)
                                  }))
                                }}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="1200">1200 ккал</option>
                                <option value="1600">1600 ккал</option>
                                <option value="2000">2000 ккал</option>
                                <option value="2500">2500 ккал</option>
                                <option value="3000">3000 ккал</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPrice" className="text-right">
                                Цена (сум)
                              </Label>
                              <Input
                                id="clientPrice"
                                type="number"
                                value={clientFormData.dailyPrice}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, dailyPrice: parseInt(e.target.value) }))}
                                className="col-span-3"
                              />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientNotes" className="text-right">
                                Заметки
                              </Label>
                              <Input
                                id="clientNotes"
                                value={clientFormData.notes || ''}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="col-span-3"
                                placeholder="Индивидуальные предпочтения..."
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientSpecialFeatures" className="text-right">
                                Особенности
                              </Label>
                              <Input
                                id="clientSpecialFeatures"
                                value={clientFormData.specialFeatures}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, specialFeatures: e.target.value }))}
                                className="col-span-3"
                                placeholder="Особые пожелания (необязательно)"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-2">
                              <Label className="text-right pt-2">
                                Дни доставки
                              </Label>
                              <div className="col-span-3 space-y-2">
                                <div className="text-xs text-slate-500 mb-2">
                                  Выберите дни недели для автоматического создания заказов
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="monday"
                                      checked={clientFormData.deliveryDays.monday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('monday', checked === true)}
                                    />
                                    <Label htmlFor="monday" className="text-sm">Понедельник</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="tuesday"
                                      checked={clientFormData.deliveryDays.tuesday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('tuesday', checked === true)}
                                    />
                                    <Label htmlFor="tuesday" className="text-sm">Вторник</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="wednesday"
                                      checked={clientFormData.deliveryDays.wednesday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('wednesday', checked === true)}
                                    />
                                    <Label htmlFor="wednesday" className="text-sm">Среда</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="thursday"
                                      checked={clientFormData.deliveryDays.thursday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('thursday', checked === true)}
                                    />
                                    <Label htmlFor="thursday" className="text-sm">Четверг</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="friday"
                                      checked={clientFormData.deliveryDays.friday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('friday', checked === true)}
                                    />
                                    <Label htmlFor="friday" className="text-sm">Пятница</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="saturday"
                                      checked={clientFormData.deliveryDays.saturday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('saturday', checked === true)}
                                    />
                                    <Label htmlFor="saturday" className="text-sm">Суббота</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="sunday"
                                      checked={clientFormData.deliveryDays.sunday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('sunday', checked === true)}
                                    />
                                    <Label htmlFor="sunday" className="text-sm">Воскресенье</Label>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <Label htmlFor="defaultCourier" className="text-sm w-full">
                                    Курьер по умолчанию:
                                    <select
                                      id="defaultCourier"
                                      value={clientFormData.defaultCourierId}
                                      onChange={(e) => setClientFormData(prev => ({ ...prev, defaultCourierId: e.target.value }))}
                                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <option value="">Нет</option>
                                      {couriers.map((courier) => (
                                        <option key={courier.id} value={courier.id}>
                                          {courier.name}
                                        </option>
                                      ))}
                                    </select>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <Checkbox
                                    id="autoOrdersEnabled"
                                    checked={clientFormData.autoOrdersEnabled}
                                    onCheckedChange={(checked) => setClientFormData(prev => ({ ...prev, autoOrdersEnabled: checked === true }))}
                                  />
                                  <Label htmlFor="autoOrdersEnabled" className="text-sm">
                                    Включить автоматическое создание заказов
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                          {clientError && (
                            <Alert className="mb-4">
                              <AlertDescription>{clientError}</AlertDescription>
                            </Alert>
                          )}
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateClientModalOpen(false)}>
                              Отмена
                            </Button>
                            <Button type="submit" disabled={isCreatingClient}>
                              {isCreatingClient ? 'Сохранение...' : (editingClientId ? 'Сохранить' : 'Создать')}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Client Management Buttons */}
                {selectedClients.size > 0 && (
                  <div className="mb-4 p-3 bg-slate-50 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Выбрано клиентов: {selectedClients.size}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const client = clients.find(c => selectedClients.has(c.id))
                            if (client) handleEditClient(client)
                          }}
                          disabled={selectedClients.size !== 1}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseSelectedClients}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Приостановить выбранных
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResumeSelectedClients}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Возобновить выбранных
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedClients}
                          disabled={selectedClients.size === 0}
                        >
                          🗑️ Удалить выбранных клиентов
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Clients Table */}
                {/* Desktop View */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              onChange={(e) => {
                                const filteredClients = clients.filter(client => {
                                  if (clientStatusFilter === 'active') return client.isActive
                                  if (clientStatusFilter === 'inactive') return !client.isActive
                                  return true
                                })
                                if (e.target.checked) {
                                  setSelectedClients(new Set(filteredClients.map(c => c.id)))
                                } else {
                                  setSelectedClients(new Set())
                                }
                              }}
                              checked={(() => {
                                const filteredClients = clients.filter(client => {
                                  if (clientStatusFilter === 'active') return client.isActive
                                  if (clientStatusFilter === 'inactive') return !client.isActive
                                  return true
                                })
                                return selectedClients.size === filteredClients.length && filteredClients.length > 0
                              })()}
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Имя</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Никнейм</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Телефон</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Адрес</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Калории</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Дни доставки</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Статус / Авто
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Особенности
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Дата добавления
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {clients
                          .filter(client => {
                            if (clientStatusFilter === 'active') return client.isActive
                            if (clientStatusFilter === 'inactive') return !client.isActive
                            return true
                          })
                          .map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300"
                                  checked={selectedClients.has(client.id)}
                                  onChange={() => handleToggleClientSelection(client.id)}
                                />
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">
                                {client.name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">
                                {client.nickName || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                {client.phone}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                {client.address}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                {client.calories} ккал
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                <div className="text-xs">
                                  {client.deliveryDays?.monday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Пн</span>}
                                  {client.deliveryDays?.tuesday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Вт</span>}
                                  {client.deliveryDays?.wednesday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Ср</span>}
                                  {client.deliveryDays?.thursday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Чт</span>}
                                  {client.deliveryDays?.friday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Пт</span>}
                                  {client.deliveryDays?.saturday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Сб</span>}
                                  {client.deliveryDays?.sunday && <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded mr-1">Вс</span>}
                                  {(!client.deliveryDays || Object.values(client.deliveryDays).every(day => !day)) && (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <div className="flex flex-col gap-1">
                                  <Badge
                                    variant={client.isActive ? "default" : "secondary"}
                                    className={
                                      `${client.isActive
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : "bg-red-100 text-red-800 border-red-200"} cursor-pointer hover:opacity-80`
                                    }
                                    onClick={() => handleToggleClientStatus(client.id, client.isActive)}
                                  >
                                    {client.isActive ? (
                                      <>
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                        Активен
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                        Приостановлен
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                {client.specialFeatures || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                📅 {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClient(client)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {clients
                    .filter(client => {
                      if (clientStatusFilter === 'active') return client.isActive
                      if (clientStatusFilter === 'inactive') return !client.isActive
                      return true
                    })
                    .map((client) => (
                      <Card key={client.id} className="overflow-hidden">
                        <CardHeader className="pb-2 bg-muted/30">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedClients.has(client.id)}
                                onCheckedChange={() => handleToggleClientSelection(client.id)}
                              />
                              <div className="flex flex-col">
                                <CardTitle className="text-base">{client.name}</CardTitle>
                                <CardDescription>{client.phone}</CardDescription>
                              </div>
                            </div>
                            <Badge
                              variant={client.isActive ? "default" : "secondary"}
                              className={
                                `${client.isActive
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"} cursor-pointer`
                              }
                              onClick={() => handleToggleClientStatus(client.id, client.isActive)}
                            >
                              {client.isActive ? "Активен" : "Приостановлен"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div className="text-sm">{client.address}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">Калории:</div>
                            <div className="text-sm">{client.calories} ккал</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div className="font-medium mb-1">Дни доставки:</div>
                            <div className="flex flex-wrap gap-1">
                              {client.deliveryDays?.monday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Пн</span>}
                              {client.deliveryDays?.tuesday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Вт</span>}
                              {client.deliveryDays?.wednesday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Ср</span>}
                              {client.deliveryDays?.thursday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Чт</span>}
                              {client.deliveryDays?.friday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Пт</span>}
                              {client.deliveryDays?.saturday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Сб</span>}
                              {client.deliveryDays?.sunday && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Вс</span>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Auto Orders Info */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Автоматические заказы
                  </h3>
                  <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                    <p className="font-medium mb-1">Информация:</p>
                    <p>• При создании клиента заказы генерируются на 30 дней вперед</p>
                    <p>• Повторная проверка только через 30 дней после создания</p>
                    <p>• Дальнейшие проверки каждые 30 дней от последней</p>
                    <p>• Время доставки: 11:00-14:00</p>
                    <p>• Система работает полностью автоматически</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent >

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            <FinanceTab />
          </TabsContent>

          {/* Order Details Modal */}
          < Dialog open={isOrderDetailsModalOpen} onOpenChange={setIsOrderDetailsModalOpen} >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Детали Заказа</DialogTitle>
                <DialogDescription>
                  Полная информация о заказе
                </DialogDescription>
              </DialogHeader>
              {selectedOrder && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Номер заказа:
                    </Label>
                    <div className="col-span-3 font-semibold">
                      #{selectedOrder.orderNumber}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      {t.admin.clients}:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.customer.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Телефон:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.customer.phone}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Адрес:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.deliveryAddress}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Время доставки:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.deliveryTime}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Количество:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.quantity}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Калории:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.calories} ккал
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Особенности:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.specialFeatures || 'Нет'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Курьер:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.courierName || 'Не назначен'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Статус:
                    </Label>
                    <div className="col-span-3">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedOrder.orderStatus)} mr-2`}></div>
                        <span>{getStatusText(selectedOrder.orderStatus)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Оплата:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.paymentMethod === 'CARD' ? 'Карта' : 'Наличные'} - {selectedOrder.paymentStatus === 'PAID' ? 'Оплачено' : 'Не оплачено'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">
                      Предоплата:
                    </Label>
                    <div className="col-span-3">
                      {selectedOrder.isPrepaid ? 'Да' : 'Нет'}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleGetAdminRoute(selectedOrder!)}
                  disabled={!selectedOrder}
                >
                  <Route className="w-4 h-4 mr-2" />
                  Маршрут
                </Button>
                <Button variant="outline" onClick={() => setIsOrderDetailsModalOpen(false)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog >

          {/* Website Builder Tab */}
          <TabsContent value="website" className="space-y-6">
            <WebsiteBuilderPage />
          </TabsContent>

          {/* Admins Tab */}
          < TabsContent value="admins" className="space-y-6" >
            <Card className="glass-card border-none">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Управление Низкими Администраторами и Курьерами</CardTitle>
                    <CardDescription>
                      Добавляйте, удаляйте и управляйте низкими администраторами и курьерами
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Добавить Администратора или Курьера</DialogTitle>
                        <DialogDescription>
                          Создайте нового низкого администратора или курьера
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateAdmin}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-2">
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
                          <div className="grid grid-cols-4 items-center gap-2">
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
                            <div className="col-span-3 relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={createFormData.password}
                                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                required={createFormData.role !== 'WORKER'}
                                minLength={6}
                                placeholder={createFormData.role === 'WORKER' ? 'Необязательно' : ''}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="role" className="text-right">
                              Роль
                            </Label>
                            <select
                              id="role"
                              value={createFormData.role}
                              onChange={(e) => setCreateFormData(prev => ({ ...prev, role: e.target.value }))}
                              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="LOW_ADMIN">Низкий администратор</option>
                              <option value="COURIER">Курьер</option>
                              <option value="WORKER">Работник</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="salary" className="text-right">
                              Зарплата
                            </Label>
                            <Input
                              id="salary"
                              type="number"
                              value={createFormData.salary || ''}
                              onChange={(e) => setCreateFormData(prev => ({ ...prev, salary: parseInt(e.target.value) || 0 }))}
                              className="col-span-3"
                              placeholder="0"
                            />
                          </div>
                          {createFormData.role === 'LOW_ADMIN' && (
                            <div className="col-span-4 space-y-3 border-t pt-4">
                              <Label className="text-sm font-medium">Разрешенные вкладки</Label>
                              <p className="text-xs text-muted-foreground">Выберите, какие вкладки будут доступны для этого администратора</p>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="tab-statistics"
                                    checked={createFormData.allowedTabs.includes('statistics')}
                                    onCheckedChange={(checked) => {
                                      const tabs = checked
                                        ? [...createFormData.allowedTabs, 'statistics']
                                        : createFormData.allowedTabs.filter(t => t !== 'statistics')
                                      setCreateFormData({ ...createFormData, allowedTabs: tabs })
                                    }}
                                  />
                                  <label htmlFor="tab-statistics" className="text-sm cursor-pointer">
                                    Статистика
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="tab-orders"
                                    checked={createFormData.allowedTabs.includes('orders')}
                                    onCheckedChange={(checked) => {
                                      const tabs = checked
                                        ? [...createFormData.allowedTabs, 'orders']
                                        : createFormData.allowedTabs.filter(t => t !== 'orders')
                                      setCreateFormData({ ...createFormData, allowedTabs: tabs })
                                    }}
                                  />
                                  <label htmlFor="tab-orders" className="text-sm cursor-pointer">
                                    Заказы
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="tab-clients"
                                    checked={createFormData.allowedTabs.includes('clients')}
                                    onCheckedChange={(checked) => {
                                      const tabs = checked
                                        ? [...createFormData.allowedTabs, 'clients']
                                        : createFormData.allowedTabs.filter(t => t !== 'clients')
                                      setCreateFormData({ ...createFormData, allowedTabs: tabs })
                                    }}
                                  />
                                  <label htmlFor="tab-clients" className="text-sm cursor-pointer">
                                    Клиенты
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="tab-chat"
                                    checked={createFormData.allowedTabs.includes('chat')}
                                    onCheckedChange={(checked) => {
                                      const tabs = checked
                                        ? [...createFormData.allowedTabs, 'chat']
                                        : createFormData.allowedTabs.filter(t => t !== 'chat')
                                      setCreateFormData({ ...createFormData, allowedTabs: tabs })
                                    }}
                                  />
                                  <label htmlFor="tab-chat" className="text-sm cursor-pointer">
                                    Чат
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
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
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop View */}
                <div className="hidden md:block space-y-4">
                  {lowAdmins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                          <Badge variant={admin.isActive ? "default" : "secondary"}>
                            {admin.role === 'COURIER' ? 'Курьер' : admin.role === 'WORKER' ? 'Работник' : 'Низкий администратор'}
                          </Badge>
                          <Badge variant={admin.isActive ? "default" : "secondary"} className="ml-2">
                            {admin.isActive ? "Активен" : "Приостановлен"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/admin/${admin.id}/password`, {
                                headers: {
                                }
                              })
                              if (response.ok) {
                                const data = await response.json()
                                toast.info(data.password || 'Пароль скрыт. Используйте функцию сброса.')
                              } else {
                                toast.error('Ошибка получения пароля')
                              }
                            } catch (error) {
                              toast.error('Ошибка соединения с сервером')
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Пароль
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/admin/${admin.id}/toggle-status`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ isActive: !admin.isActive })
                              })
                              if (response.ok) {
                                fetchData()
                                toast.success(`Статус ${admin.isActive ? 'приостановлен' : 'активирован'}`)
                              } else {
                                toast.error('Ошибка изменения статуса')
                              }
                            } catch (error) {
                              toast.error('Ошибка соединения с сервером')
                            }
                          }}
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
                          onClick={async () => {
                            if (!confirm(`Вы уверены, что хотите удалить администратора ${admin.name}?`)) {
                              return
                            }
                            try {
                              const response = await fetch(`/api/admin/${admin.id}/delete`, {
                                method: 'DELETE',
                                headers: {
                                }
                              })
                              if (response.ok) {
                                fetchData()
                                toast.success('Администратор удален')
                              } else {
                                const data = await response.json()
                                toast.error(data.error || 'Ошибка удаления администратора')
                              }
                            } catch (error) {
                              toast.error('Ошибка соединения с сервером')
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Удалить
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAdmin(admin)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Изменить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {lowAdmins.map((admin) => (
                    <Card key={admin.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{admin.name}</CardTitle>
                              <CardDescription>{admin.email}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={admin.isActive ? "default" : "secondary"}>
                            {admin.isActive ? "Активен" : "Приостановлен"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">
                            {admin.role === 'COURIER' ? 'Курьер' : admin.role === 'WORKER' ? 'Работник' : 'Низкий администратор'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/${admin.id}/password`, {
                                  headers: {
                                  }
                                })
                                if (response.ok) {
                                  const data = await response.json()
                                  toast.info(data.password || 'Пароль скрыт. Используйте функцию сброса.')
                                } else {
                                  toast.error('Ошибка получения пароля')
                                }
                              } catch (error) {
                                toast.error('Ошибка соединения с сервером')
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Пароль
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEditAdmin(admin)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Изменить
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={admin.isActive ? "secondary" : "default"}
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/${admin.id}/toggle-status`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ isActive: !admin.isActive })
                                })
                                if (response.ok) {
                                  fetchData()
                                  toast.success(`Статус ${admin.isActive ? 'приостановлен' : 'активирован'}`)
                                } else {
                                  toast.error('Ошибка изменения статуса')
                                }
                              } catch (error) {
                                toast.error('Ошибка соединения с сервером')
                              }
                            }}
                          >
                            {admin.isActive ? (
                              <Pause className="w-4 h-4 mr-1" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            {admin.isActive ? "Пауза" : "Старт"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
                                try {
                                  const response = await fetch(`/api/admin/${admin.id}/delete`, {
                                    method: 'DELETE',
                                    headers: {
                                    }
                                  })
                                  if (response.ok) {
                                    fetchData()
                                    toast.success('Пользователь удален')
                                  } else {
                                    toast.error('Ошибка удаления')
                                  }
                                } catch (error) {
                                  toast.error('Ошибка соединения с сервером')
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interface Tab */}

          < TabsContent value="interface" className="space-y-6" >
            <InterfaceSettings />
          </TabsContent >

          {/* History Tab */}
          < TabsContent value="history" className="space-y-6" >
            <HistoryTable role="MIDDLE_ADMIN" />
          </TabsContent >

          {/* Profile Tab with Chat and Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Профиль и Настройки</CardTitle>
                <CardDescription>
                  Управляйте своим профилем и общайтесь с командой
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Безопасность</h3>
                  <Button
                    variant="outline"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Изменить пароль
                  </Button>
                  <ChangePasswordModal
                    isOpen={isChangePasswordOpen}
                    onClose={() => setIsChangePasswordOpen(false)}
                  />
                </div>

                {/* Divider */}
                <div className="border-t" />

                {/* Chat Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Сообщения</h3>
                  <ChatTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bin" className="space-y-4">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList>
                <TabsTrigger value="orders">{t.admin.deletedOrders}</TabsTrigger>
                <TabsTrigger value="clients">{t.admin.deletedClients}</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold tracking-tight">Корзина заказов</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRestoreSelectedOrders}
                      variant="outline"
                      disabled={selectedOrders.size === 0}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {t.admin.restoreSelected} ({selectedOrders.size})
                    </Button>
                    <Button onClick={fetchBinOrders} variant="outline">
                      <History className="mr-2 h-4 w-4" />
                      {t.common.actions}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <OrdersTable
                    orders={binOrders}
                    selectedOrders={selectedOrders}
                    onSelectOrder={handleOrderSelect}
                    onSelectAll={handleSelectAllBinOrders}
                    onDeleteSelected={handlePermanentDeleteOrders}
                    onViewOrder={(order) => {
                      setSelectedOrder(order)
                      setIsOrderDetailsModalOpen(true)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="clients" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold tracking-tight">Корзина клиентов</h2>
                  <div className="flex gap-2">
                    {selectedBinClients.size > 0 && (
                      <div className="flex gap-2">
                        <Button onClick={handleRestoreSelectedClients} variant="outline">
                          <History className="mr-2 h-4 w-4" />
                          Восстановить ({selectedBinClients.size})
                        </Button>
                        <Button
                          onClick={handlePermanentDeleteClients}
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить навсегда ({selectedBinClients.size})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            <Checkbox
                              checked={binClients.length > 0 && selectedBinClients.size === binClients.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBinClients(new Set(binClients.map(c => c.id)))
                                } else {
                                  setSelectedBinClients(new Set())
                                }
                              }}
                            />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.name}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.phone}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.address}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.common.date}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.role}</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {binClients.map((client) => (
                          <tr key={client.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedBinClients.has(client.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedBinClients)
                                  if (checked) {
                                    newSelected.add(client.id)
                                  } else {
                                    newSelected.delete(client.id)
                                  }
                                  setSelectedBinClients(newSelected)
                                }}
                              />
                            </td>
                            <td className="p-4 align-middle font-medium">{client.name}</td>
                            <td className="p-4 align-middle">{client.phone}</td>
                            <td className="p-4 align-middle">{client.address}</td>
                            <td className="p-4 align-middle">
                              {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US') : '-'}
                            </td>
                            <td className="p-4 align-middle">{client.deletedBy || '-'}</td>
                          </tr>
                        ))}
                        {binClients.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              {t.finance.noClients}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

          </TabsContent>

          {/* Warehouse Tab */}
          <TabsContent value="warehouse" className="space-y-4">
            <WarehouseTab />
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-4">
            <FinanceTab />
          </TabsContent>

          {/* Sets Tab - Custom Menu Sets */}
          <TabsContent value="sets" className="space-y-4">
            <SetsTab />
          </TabsContent>
        </Tabs>
      </main >
      {/* Bulk Edit Orders Modal */}
      < Dialog open={isBulkEditOrdersModalOpen} onOpenChange={setIsBulkEditOrdersModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактировать выбранные заказы ({selectedOrders.size})</DialogTitle>
            <DialogDescription>
              Измените параметры для выбранных заказов. Оставьте поля пустыми, чтобы не менять их.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkOrderStatus" className="text-right">
                Статус
              </Label>
              <select
                id="bulkOrderStatus"
                value={bulkOrderUpdates.orderStatus}
                onChange={(e) => setBulkOrderUpdates(prev => ({ ...prev, orderStatus: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Не менять</option>
                <option value="PENDING">Ожидает</option>
                <option value="IN_DELIVERY">В доставке</option>
                <option value="DELIVERED">Доставлен</option>
                <option value="FAILED">Отменен</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkPaymentStatus" className="text-right">
                Оплата
              </Label>
              <select
                id="bulkPaymentStatus"
                value={bulkOrderUpdates.paymentStatus}
                onChange={(e) => setBulkOrderUpdates(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Не менять</option>
                <option value="PAID">Оплачен</option>
                <option value="UNPAID">Не оплачен</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkCourier" className="text-right">
                Курьер
              </Label>
              <select
                id="bulkCourier"
                value={bulkOrderUpdates.courierId}
                onChange={(e) => setBulkOrderUpdates(prev => ({ ...prev, courierId: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Не менять</option>
                <option value="none">Снять курьера</option>
                {couriers.map(courier => (
                  <option key={courier.id} value={courier.id}>{courier.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkDeliveryDate" className="text-right">
                Дата
              </Label>
              <Input
                id="bulkDeliveryDate"
                type="date"
                value={bulkOrderUpdates.deliveryDate}
                onChange={(e) => setBulkOrderUpdates(prev => ({ ...prev, deliveryDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditOrdersModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleBulkUpdateOrders} disabled={isUpdatingBulk}>
              {isUpdatingBulk ? t.common.loading : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Bulk Edit Clients Modal */}
      < Dialog open={isBulkEditClientsModalOpen} onOpenChange={setIsBulkEditClientsModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактировать выбранные клиентов ({selectedClients.size})</DialogTitle>
            <DialogDescription>
              Измените параметры для выбранных клиентов. Оставьте поля пустыми, чтобы не менять их.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkIsActive" className="text-right">
                Статус
              </Label>
              <select
                id="bulkIsActive"
                value={bulkClientUpdates.isActive === undefined ? '' : bulkClientUpdates.isActive.toString()}
                onChange={(e) => setBulkClientUpdates(prev => ({
                  ...prev,
                  isActive: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Не менять</option>
                <option value="true">Активен</option>
                <option value="false">Приостановлен</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="bulkCalories" className="text-right">
                Калории
              </Label>
              <select
                id="bulkCalories"
                value={bulkClientUpdates.calories}
                onChange={(e) => setBulkClientUpdates(prev => ({ ...prev, calories: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Не менять</option>
                <option value="1200">1200</option>
                <option value="1600">1600</option>
                <option value="2000">2000</option>
                <option value="2500">2500</option>
                <option value="3000">3000</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditClientsModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleBulkUpdateClients} disabled={isUpdatingBulk}>
              {isUpdatingBulk ? t.common.loading : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Order Details Modal */}
      < Dialog open={isOrderDetailsModalOpen} onOpenChange={setIsOrderDetailsModalOpen} >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Детали заказа #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Полная информация о заказе и клиенте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {selectedOrder && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Статус:</span>
                    <Badge
                      className={
                        selectedOrder.orderStatus === 'DELIVERED'
                          ? "bg-green-100 text-green-800"
                          : selectedOrder.orderStatus === 'IN_DELIVERY'
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                      }
                    >
                      {selectedOrder.orderStatus === 'DELIVERED'
                        ? "Доставлен"
                        : selectedOrder.orderStatus === 'IN_DELIVERY'
                          ? "В доставке"
                          : "Ожидает"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Оплата:</span>
                    <Badge
                      variant={selectedOrder.paymentStatus === 'PAID' ? "default" : "destructive"}
                      className={selectedOrder.paymentStatus === 'PAID' ? "bg-green-100 text-green-800" : ""}
                    >
                      {selectedOrder.paymentStatus === 'PAID' ? "Оплачен" : "Не оплачен"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Метод:</span>
                    <span className="text-sm">{selectedOrder.paymentMethod === 'CASH' ? 'Наличные' : 'Карта'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Количество:</span>
                    <span className="text-sm font-bold">{selectedOrder.quantity} порц.</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Калории:</span>
                    <span className="text-sm">{selectedOrder.calories} ккал</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Клиент</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedOrder.customerName || selectedOrder.customer?.name}</p>
                      <p className="text-xs text-slate-500">{selectedOrder.customer?.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Доставка</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                      <p className="text-sm">{selectedOrder.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="text-sm">{selectedOrder.deliveryTime}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <p className="text-sm">
                        {selectedOrder.deliveryDate && new Date(selectedOrder.deliveryDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedOrder.specialFeatures && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold text-sm">Особенности</h4>
                    <p className="text-sm bg-orange-50 p-2 rounded border border-orange-100 text-orange-800">
                      {selectedOrder.specialFeatures}
                    </p>
                  </div>
                )}

                {selectedOrder.courier && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold text-sm">Курьер</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-sm">{selectedOrder.courier.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailsModalOpen(false)}>
              Закрыть
            </Button>
            {selectedOrder && (
              <Button onClick={() => {
                setIsOrderDetailsModalOpen(false)
                handleEditOrder(selectedOrder)
              }}>
                Редактировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Edit Admin Modal */}
      < Dialog open={isEditAdminModalOpen} onOpenChange={setIsEditAdminModalOpen} >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать Администратора</DialogTitle>
            <DialogDescription>
              Измените данные администратора или курьера
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAdmin}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Имя
                </Label>
                <Input
                  id="edit-name"
                  value={editAdminFormData.name}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editAdminFormData.email}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Пароль
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Оставьте пустым, чтобы не менять"
                  value={editAdminFormData.password}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, password: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Роль
                </Label>
                <select
                  id="edit-role"
                  value={editAdminFormData.role}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, role: e.target.value })}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="LOW_ADMIN">Низкий администратор</option>
                  <option value="COURIER">Курьер</option>
                  <option value="WORKER">Работник</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-salary" className="text-right">
                  Зарплата
                </Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={editAdminFormData.salary || ''}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, salary: parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-active" className="text-right">
                  Статус
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="edit-active"
                    checked={editAdminFormData.isActive}
                    onCheckedChange={(checked) => setEditAdminFormData({ ...editAdminFormData, isActive: checked as boolean })}
                  />
                  <label
                    htmlFor="edit-active"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Активен
                  </label>
                </div>
              </div>

              {editAdminFormData.role === 'LOW_ADMIN' && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Доступ к вкладкам
                  </Label>
                  <div className="col-span-3 space-y-2 border rounded-md p-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tab-orders"
                        checked={editAdminFormData.allowedTabs.includes('orders')}
                        onCheckedChange={(checked) => {
                          const tabs = checked
                            ? [...editAdminFormData.allowedTabs, 'orders']
                            : editAdminFormData.allowedTabs.filter(t => t !== 'orders')
                          setEditAdminFormData({ ...editAdminFormData, allowedTabs: tabs })
                        }}
                      />
                      <label htmlFor="tab-orders" className="text-sm">Заказы</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tab-clients"
                        checked={editAdminFormData.allowedTabs.includes('clients')}
                        onCheckedChange={(checked) => {
                          const tabs = checked
                            ? [...editAdminFormData.allowedTabs, 'clients']
                            : editAdminFormData.allowedTabs.filter(t => t !== 'clients')
                          setEditAdminFormData({ ...editAdminFormData, allowedTabs: tabs })
                        }}
                      />
                      <label htmlFor="tab-clients" className="text-sm">Клиенты</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tab-chat"
                        checked={editAdminFormData.allowedTabs.includes('chat')}
                        onCheckedChange={(checked) => {
                          const tabs = checked
                            ? [...editAdminFormData.allowedTabs, 'chat']
                            : editAdminFormData.allowedTabs.filter(t => t !== 'chat')
                          setEditAdminFormData({ ...editAdminFormData, allowedTabs: tabs })
                        }}
                      />
                      <label htmlFor="tab-chat" className="text-sm">Чат</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditAdminModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >

      {/* Create Order Modal */}
      < Dialog open={isCreateOrderModalOpen} onOpenChange={setIsCreateOrderModalOpen} >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingOrderId ? 'Редактировать Заказ' : 'Создать Новый Заказ'}</DialogTitle>
            <DialogDescription>
              {editingOrderId ? 'Измените данные заказа' : 'Заполните информацию о новом заказе. Вы можете выбрать клиента из списка для автозаполнения данных.'}
            </DialogDescription>
            {!editingOrderId && orderFormData.selectedClientId && orderFormData.selectedClientId !== "manual" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-xs text-green-800">
                  ✅ Данные клиента заполнены автоматически
                </p>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleCreateOrder}>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="clientSelect" className="text-right">
                    Выбрать клиента
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={orderFormData.selectedClientId}
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите клиента из списка или введите данные вручную" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">-- Ввести данные вручную --</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 mt-1">
                      Выберите клиента для автозаполнения
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="customerName" className="text-right">
                    Имя клиента
                    {orderFormData.selectedClientId && (
                      <span className="text-xs text-green-600 ml-1">✓</span>
                    )}
                  </Label>
                  <Input
                    id="customerName"
                    value={orderFormData.customerName}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className={`col-span-3 ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="customerPhone" className="text-right">
                    Телефон клиента
                    {orderFormData.selectedClientId && (
                      <span className="text-xs text-green-600 ml-1">✓</span>
                    )}
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder="+998 XX XXX XX XX"
                      value={orderFormData.customerPhone}
                      onChange={(e) => setOrderFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className={orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Формат: +998 XX XXX XX XX</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="deliveryAddress" className="text-right">
                    Адрес доставки
                    {orderFormData.selectedClientId && (
                      <span className="text-xs text-green-600 ml-1">✓</span>
                    )}
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="relative">
                      <Input
                        id="deliveryAddress"
                        value={orderFormData.deliveryAddress}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        placeholder="Адрес или Google Maps ссылка"
                        className={`col-span-3 ${orderFormData.latitude && orderFormData.longitude ? 'pr-10 border-green-500 focus:border-green-500' : ''} ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                        required
                      />
                      {orderFormData.latitude && orderFormData.longitude && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-400">
                        Можно вставить Google Maps ссылку
                      </p>
                      {orderFormData.latitude && orderFormData.longitude && (
                        <p className="text-xs text-green-600 font-medium">
                          📍 {orderFormData.latitude.toFixed(4)}, {orderFormData.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="deliveryTime" className="text-right">
                    Время доставки
                  </Label>
                  <Input
                    id="deliveryTime"
                    type="time"
                    value={orderFormData.deliveryTime}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="quantity" className="text-right">
                    Количество
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={orderFormData.quantity}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="calories" className="text-right">
                    Калории
                    {orderFormData.selectedClientId && (
                      <span className="text-xs text-green-600 ml-1">✓</span>
                    )}
                  </Label>
                  <select
                    id="calories"
                    value={orderFormData.calories}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, calories: parseInt(e.target.value) }))}
                    className={`col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                  >
                    <option value="1200">1200 ккал</option>
                    <option value="1600">1600 ккал</option>
                    <option value="2000">2000 ккал</option>
                    <option value="2500">2500 ккал</option>
                    <option value="3000">3000 ккал</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="paymentMethod" className="text-right">
                    Оплата
                  </Label>
                  <select
                    id="paymentMethod"
                    value={orderFormData.paymentMethod}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="CASH">Наличные</option>
                    <option value="CARD">Карта</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="specialFeatures" className="text-right">
                    Особенности
                    {orderFormData.selectedClientId && (
                      <span className="text-xs text-green-600 ml-1">✓</span>
                    )}
                  </Label>
                  <Input
                    id="specialFeatures"
                    value={orderFormData.specialFeatures}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, specialFeatures: e.target.value }))}
                    className={`col-span-3 ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                    placeholder="Особые пожелания"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="courier" className="text-right">
                    Курьер
                  </Label>
                  <select
                    id="courier"
                    value={orderFormData.courierId}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, courierId: e.target.value }))}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Автоматически (если есть у клиента)</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name}
                      </option>
                    ))}
                  </select>
                </div>
                {orderError && (
                  <div className="col-span-4">
                    <Alert variant="destructive">
                      <AlertDescription>{orderError}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </form>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsCreateOrderModalOpen(false)
              setOrderFormData(prev => ({ ...prev, latitude: null, longitude: null }))
              setEditingOrderId(null)
            }}>
              Отмена
            </Button>
            <Button type="submit" disabled={isCreatingOrder} onClick={handleCreateOrder}>
              {isCreatingOrder ? 'Сохранение...' : (editingOrderId ? 'Сохранить изменения' : 'Создать заказ')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Create Courier Modal */}
      < Dialog open={isCreateCourierModalOpen} onOpenChange={setIsCreateCourierModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать Курьера</DialogTitle>
            <DialogDescription>
              Создайте новый аккаунт для курьера
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourier}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierName" className="text-right">
                  Имя
                </Label>
                <Input
                  id="courierName"
                  value={courierFormData.name}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierEmail" className="text-right">
                  Email
                </Label>
                <Input
                  id="courierEmail"
                  type="email"
                  value={courierFormData.email}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierPassword" className="text-right">
                  Пароль
                </Label>
                <Input
                  id="courierPassword"
                  type="password"
                  value={courierFormData.password}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            {courierError && (
              <Alert className="mb-4">
                <AlertDescription>{courierError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateCourierModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isCreatingCourier}>
                {isCreatingCourier ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Feature Modal */}
      <Dialog open={isCreateFeatureModalOpen} onOpenChange={setIsCreateFeatureModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать Особенность</DialogTitle>
            <DialogDescription>
              Создайте новую особенность для заказов
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFeature}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="featureName" className="text-right">
                  Название
                </Label>
                <Input
                  id="featureName"
                  value={featureFormData.name}
                  onChange={(e) => setFeatureFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="featureDescription" className="text-right">
                  Описание
                </Label>
                <Input
                  id="featureDescription"
                  value={featureFormData.description}
                  onChange={(e) => setFeatureFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="featureType" className="text-right">
                  Тип
                </Label>
                <select
                  id="featureType"
                  value={featureFormData.type}
                  onChange={(e) => setFeatureFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="TEXT">Текст</option>
                  <option value="SELECT">Выбор из списка</option>
                  <option value="CHECKBOX">Флажок</option>
                </select>
              </div>
              {featureFormData.type === 'SELECT' && (
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="featureOptions" className="text-right">
                    Варианты
                  </Label>
                  <Input
                    id="featureOptions"
                    value={featureFormData.options}
                    onChange={(e) => setFeatureFormData(prev => ({ ...prev, options: e.target.value }))}
                    className="col-span-3"
                    placeholder="Вариант1, Вариант2, Вариант3"
                  />
                </div>
              )}
            </div>
            {featureError && (
              <Alert className="mb-4">
                <AlertDescription>{featureError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateFeatureModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isCreatingFeature}>
                {isCreatingFeature ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}