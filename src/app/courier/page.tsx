'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Settings,
  User,
  Utensils,
  Wallet,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { CourierProfile } from '@/components/courier/CourierProfile'
import { ChatCenter } from '@/components/chat/ChatCenter'
import { ChatTab } from '@/components/chat/ChatTab'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RouteOptimizeButton } from '@/components/admin/RouteOptimizeButton'
import { extractCoordsFromText } from '@/lib/geo'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import type { DateRange } from 'react-day-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Order {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
    address?: string
    latitude?: number | null
    longitude?: number | null
  }
  deliveryAddress: string
  latitude: number | null
  longitude: number | null
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  orderStatus: string
  deliveryDate?: string
  createdAt: string
}

export default function CourierPage() {
  const { t, language } = useLanguage()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { from: today, to: today }
  })
  const dateRangeRef = useRef<DateRange | undefined>(undefined)
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('orders')
  const [courierData, setCourierData] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [isOrderPaused, setIsOrderPaused] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [lastOrdersSyncAt, setLastOrdersSyncAt] = useState<Date | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_DELIVERY' | 'PAUSED'>('ALL')
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const lastSentLocationRef = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const isSendingLocationRef = useRef(false)
  const watchIdRef = useRef<number | null>(null)
  const didInitialRangeFetchRef = useRef(false)

  useEffect(() => {
    dateRangeRef.current = dateRange
  }, [dateRange])

  const uiText = useMemo(
    () => ({
      en: {
        notSynced: 'Not synced yet',
        metersAway: 'm away',
        kmAway: 'km away',
        active: 'Active',
        paused: 'Paused',
        lastSync: 'Last sync',
        deliveryMomentum: 'Delivery progress',
        nextStop: 'Next stop',
        inRoute: 'In route',
        pending: 'Pending',
        noPendingStop: 'No pending stop in queue.',
        navigate: 'Navigate',
        review: 'Review',
        refresh: 'Refresh',
        all: 'All',
        noOrdersInStatus: 'No orders in this status',
        tryAnotherStatus: 'Try another status filter or refresh queue.',
        delivered: 'Delivered',
        notDelivered: 'Not delivered',
        notes: 'Notes',
        details: 'Details',
        new: 'New',
        note: 'Note',
        quantityUnit: 'pcs',
        amountReceived: 'Amount received from client',
        calendar: 'Calendar',
        today: 'Today',
        thisWeek: 'This week',
        thisMonth: 'This month',
        clearRange: 'Clear',
        allTime: 'All time',
      },
      uz: {
        notSynced: 'Sinxronlanmagan',
        metersAway: 'm qoldi',
        kmAway: 'km qoldi',
        active: 'Faol',
        paused: 'Pauza',
        lastSync: 'Oxirgi sinxron',
        deliveryMomentum: 'Yetkazish progressi',
        nextStop: 'Keyingi nuqta',
        inRoute: 'Yolda',
        pending: 'Kutilmoqda',
        noPendingStop: 'Navbatda keyingi nuqta yoq.',
        navigate: 'Yonaltirish',
        review: 'Korib chiqish',
        refresh: 'Yangilash',
        all: 'Barchasi',
        noOrdersInStatus: 'Bu holatda buyurtmalar yoq',
        tryAnotherStatus: 'Boshqa holatni tanlang yoki yangilang.',
        delivered: 'Yetkazildi',
        notDelivered: 'Yetkazilmagan',
        notes: 'Izohlar',
        details: 'Batafsil',
        new: 'Yangi',
        note: 'Izoh',
        quantityUnit: 'dona',
        amountReceived: 'Mijozdan olingan summa',
        calendar: 'Kalendar',
        today: 'Bugun',
        thisWeek: 'Shu hafta',
        thisMonth: 'Shu oy',
        clearRange: 'Tozalash',
        allTime: 'Barcha vaqt',
      },
      ru: {
        notSynced: 'Еще не синхронизировано',
        metersAway: 'м до точки',
        kmAway: 'км до точки',
        active: 'Активные',
        paused: 'На паузе',
        lastSync: 'Последняя синхронизация',
        deliveryMomentum: 'Прогресс доставки',
        nextStop: 'Следующая точка',
        inRoute: 'В пути',
        pending: 'Ожидает',
        noPendingStop: 'В очереди нет следующей точки.',
        navigate: 'Маршрут',
        review: 'Проверить',
        refresh: 'Обновить',
        all: 'Все',
        noOrdersInStatus: 'Нет заказов с этим статусом',
        tryAnotherStatus: 'Выберите другой статус или обновите список.',
        delivered: 'Доставлен',
        notDelivered: 'Не доставлено',
        notes: 'Комментарий',
        details: 'Детали',
        new: 'Новый',
        note: 'Примечание',
        quantityUnit: 'шт',
        amountReceived: 'Получено от клиента',
        calendar: 'Календарь',
        today: 'Сегодня',
        thisWeek: 'Эта неделя',
        thisMonth: 'Этот месяц',
        clearRange: 'Сбросить',
        allTime: 'За все время',
      },
    })[language],
    [language]
  )

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'IN_DELIVERY' || order.orderStatus === 'PENDING').length,
    [orders]
  )

  const pausedOrdersCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'PAUSED').length,
    [orders]
  )

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'PENDING').length,
    [orders]
  )

  const inDeliveryOrdersCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'IN_DELIVERY').length,
    [orders]
  )

  const deliveredOrdersCount = useMemo(
    () => allOrders.filter((order) => order.orderStatus === 'DELIVERED').length,
    [allOrders]
  )

  const notDeliveredOrdersCount = useMemo(
    () =>
      allOrders.filter((order) =>
        order.orderStatus === 'FAILED' || order.orderStatus === 'CANCELED' || order.orderStatus === 'CANCELLED'
      ).length,
    [allOrders]
  )

  const lastSyncLabel = useMemo(
    () =>
      lastOrdersSyncAt
        ? lastOrdersSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : uiText.notSynced,
    [lastOrdersSyncAt, uiText.notSynced]
  )

  const courierBalance = useMemo(() => {
    const value = Number(courierData?.balance ?? 0)
    return Number.isFinite(value) ? value : 0
  }, [courierData])

  const formattedCourierBalance = useMemo(() => {
    const locale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
    return `${Math.round(courierBalance).toLocaleString(locale)} UZS`
  }, [courierBalance, language])

  const visibleOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return orders
    return orders.filter((order) => order.orderStatus === orderStatusFilter)
  }, [orderStatusFilter, orders])

  const nextStopOrder = useMemo(
    () => orders.find((order) => order.orderStatus === 'IN_DELIVERY' || order.orderStatus === 'PENDING') || null,
    [orders]
  )

  const deliveryMomentum = useMemo(() => {
    if (activeOrdersCount === 0) return 0
    return Math.round((inDeliveryOrdersCount / activeOrdersCount) * 100)
  }, [activeOrdersCount, inDeliveryOrdersCount])

  const orderedVisibleOrders = useMemo(() => {
    const statusPriority: Record<string, number> = {
      IN_DELIVERY: 0,
      PENDING: 1,
      PAUSED: 2,
    }

    return [...visibleOrders].sort((a, b) => {
      const statusDiff = (statusPriority[a.orderStatus] ?? 99) - (statusPriority[b.orderStatus] ?? 99)
      if (statusDiff !== 0) return statusDiff
      return (a.orderNumber ?? 0) - (b.orderNumber ?? 0)
    })
  }, [visibleOrders])

  const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371e3
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)))
  }

  const nextStopDistanceLabel = useMemo(() => {
    if (!nextStopOrder || !currentLocation) return null
    if (nextStopOrder.latitude == null || nextStopOrder.longitude == null) return null

    const meters = distanceMeters(currentLocation, { lat: nextStopOrder.latitude, lng: nextStopOrder.longitude })
    if (!Number.isFinite(meters)) return null
    if (meters < 1000) return `${Math.round(meters)} ${uiText.metersAway}`
    return `${(meters / 1000).toFixed(1)} ${uiText.kmAway}`
  }, [currentLocation, nextStopOrder, uiText.kmAway, uiText.metersAway])

  const sendLocationUpdate = async (lat: number, lng: number, force = false) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (isSendingLocationRef.current) return

    const now = Date.now()
    const previous = lastSentLocationRef.current
    const minDistanceMeters = 20
    const minIntervalMs = 10_000
    const movedEnough = previous ? distanceMeters(previous, { lat, lng }) >= minDistanceMeters : true
    const waitedEnough = previous ? now - previous.at >= minIntervalMs : true

    if (!force && !movedEnough && !waitedEnough) return

    isSendingLocationRef.current = true
    try {
      const response = await fetch('/api/courier/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
        keepalive: true,
      })
      if (response.ok) {
        lastSentLocationRef.current = { lat, lng, at: now }
      }
    } catch (error) {
      console.error('Error sending courier location:', error)
    } finally {
      isSendingLocationRef.current = false
    }
  }

  const applyLocation = (lat: number, lng: number, forceSend = false) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setCurrentLocation({ lat, lng })
    void sendLocationUpdate(lat, lng, forceSend)
  }

  useEffect(() => {
    const loadCourierData = async () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          setCourierData(user)
        } catch {
          // ignore
        }
      }

      try {
        const response = await fetch('/api/courier/profile')
        if (response.ok) {
          const data = await response.json()
          const payload = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: 'COURIER',
            balance: Number(data.balance ?? 0),
          }
          setCourierData(payload)
          localStorage.setItem('user', JSON.stringify(payload))
        }
      } catch (error) {
        console.error('Error fetching courier profile:', error)
      }
    }

    void loadCourierData()
    void fetchOrders()
    getCurrentLocation(true)

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          applyLocation(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error('Location watch error:', error)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 12000,
        }
      )
    }

    const locationInterval = setInterval(() => getCurrentLocation(false), 45000)
    const ordersInterval = setInterval(() => {
      void fetchOrders(true)
    }, 60000)

    return () => {
      clearInterval(locationInterval)
      clearInterval(ordersInterval)
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  const getCurrentLocation = (forceSend = false) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyLocation(position.coords.latitude, position.coords.longitude, forceSend)
        },
        (error) => {
          console.error('Error getting location:', error)
          setCurrentLocation((prev) => prev ?? { lat: 41.2995, lng: 69.2401 })
        },
        {
          enableHighAccuracy: false,
          maximumAge: 10000,
          timeout: 12000,
        }
      )
    }
  }

  const getLocalIsoDate = (d: Date = new Date()) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const fetchOrders = async (background = false) => {
    if (!background) setLoading(true)
    else setIsRefreshing(true)

    try {
      const today = getLocalIsoDate()
      const range = dateRangeRef.current
      const fromIso = range?.from ? getLocalIsoDate(range.from) : today
      const toIso = range?.from ? getLocalIsoDate(range.to ?? range.from) : today
      const response = await fetch(`/api/courier/orders?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`)

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

        if (response.ok) {
          const ordersData = await response.json()

        const normalized: Order[] = (Array.isArray(ordersData) ? ordersData : []).map((o: any) => {
          const orderLat = typeof o?.latitude === 'number' ? o.latitude : null
          const orderLng = typeof o?.longitude === 'number' ? o.longitude : null
          const customerLat = typeof o?.customer?.latitude === 'number' ? o.customer.latitude : null
          const customerLng = typeof o?.customer?.longitude === 'number' ? o.customer.longitude : null
          const parsed = extractCoordsFromText(String(o?.deliveryAddress ?? ''))

          const latitude = orderLat ?? customerLat ?? parsed?.lat ?? null
          const longitude = orderLng ?? customerLng ?? parsed?.lng ?? null

          return {
            ...o,
            latitude,
            longitude,
            customer: o?.customer ?? { name: '', phone: '' },
          } as Order
        })

        const activeAndPendingOrders = normalized
          .filter(
            (order: Order) =>
              order.orderStatus === 'PENDING' || order.orderStatus === 'IN_DELIVERY' || order.orderStatus === 'PAUSED'
          )
          .sort((a: Order, b: Order) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0))
        setAllOrders(normalized)
        setOrders(activeAndPendingOrders)
        setLastOrdersSyncAt(new Date())

        if (selectedOrder) {
          const updatedSelectedOrder = activeAndPendingOrders.find((o: Order) => o.id === selectedOrder.id)
          if (updatedSelectedOrder) {
            setSelectedOrder(updatedSelectedOrder)
            setIsOrderPaused(updatedSelectedOrder.orderStatus === 'PAUSED')
          } else {
            setSelectedOrder(null)
            setIsOrderOpen(false)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      if (!background) toast.error(t.common.error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!didInitialRangeFetchRef.current) {
      didInitialRangeFetchRef.current = true
      return
    }

    void fetchOrders(true)
  }, [dateRange])

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsOrderOpen(true)
    setIsOrderPaused(order.orderStatus === 'PAUSED')
    setAmountReceived('')
  }

  const handleCloseOrderDetailSheet = () => {
    setIsOrderOpen(false)
    setSelectedOrder(null)
    setAmountReceived('')
  }

  const handleStartDelivery = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'start_delivery' }),
      })

      if (response.ok) {
        toast.success(t.courier.startDelivery, {
          description: t.courier.activeOrder,
        })

        setOrders((prevOrders) => prevOrders.map((o) => (o.id === selectedOrder.id ? { ...o, orderStatus: 'IN_DELIVERY' } : o)))
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'IN_DELIVERY' } : null))
        setIsOrderPaused(false)
      }
    } catch (error) {
      console.error('Error starting delivery:', error)
      toast.error(t.common.error)
    }
  }

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return

    const confirmClose = window.confirm(`${t.courier.completeDelivery}?`)
    if (!confirmClose) return

    if (isCompleting) return
    setIsCompleting(true)

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete_delivery',
          amountReceived: amountReceived ? parseFloat(amountReceived) : null,
        }),
      })

      if (response.ok) {
        toast.success(t.common.success)
        handleCloseOrderDetailSheet()
        void fetchOrders()
      } else if (response.status === 401) {
        window.location.href = '/login'
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || t.common.error)
      }
    } catch (error) {
      console.error('Error completing delivery:', error)
      toast.error(t.common.error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handlePauseOrder = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'pause_delivery' }),
      })

      if (response.ok) {
        setIsOrderPaused(true)
        toast.info(t.courier.pauseDelivery)
        setOrders((prevOrders) => prevOrders.map((o) => (o.id === selectedOrder.id ? { ...o, orderStatus: 'PAUSED' } : o)))
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'PAUSED' } : null))
      }
    } catch (error) {
      console.error('Error pausing delivery:', error)
      toast.error(t.common.error)
    }
  }

  const handleResumeOrder = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'resume_delivery' }),
      })

      if (response.ok) {
        setIsOrderPaused(false)
        toast.success(t.courier.resumeDelivery)
        setOrders((prevOrders) => prevOrders.map((o) => (o.id === selectedOrder.id ? { ...o, orderStatus: 'IN_DELIVERY' } : o)))
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'IN_DELIVERY' } : null))
      }
    } catch (error) {
      console.error('Error resuming delivery:', error)
      toast.error(t.common.error)
    }
  }

  const openRouteForOrder = (order: Order) => {
    try {
      const hasCoords = order.latitude != null && order.longitude != null
      const destination = hasCoords ? `${order.latitude},${order.longitude}` : order.deliveryAddress

      let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`

      if (currentLocation) {
        url += `&origin=${currentLocation.lat},${currentLocation.lng}`
      }

      window.open(url, '_blank')
    } catch (error) {
      console.error('Error opening maps:', error)
      toast.error(t.common.error)
    }
  }

  const handleGetRoute = () => {
    if (!selectedOrder) return
    openRouteForOrder(selectedOrder)
  }

  const handleLogout = async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    await signOut({ callbackUrl: '/', redirect: true })
  }

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid withdrawal amount')
      return
    }

    setIsWithdrawing(true)
    try {
      const response = await fetch('/api/courier/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || t.common.error)
      }

      const nextBalance = Number(data?.balance ?? courierBalance - amount)
      setCourierData((prev: any) => {
        const next = { ...(prev || {}), balance: nextBalance }
        try {
          localStorage.setItem('user', JSON.stringify(next))
        } catch {
          // ignore localStorage failures
        }
        return next
      })

      setWithdrawAmount('')
      setIsWithdrawOpen(false)
      toast.success('Withdrawal completed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.error)
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background bg-app-paper">
        <div className="pointer-events-none absolute inset-0 [background:var(--app-bg-grid)] opacity-45" />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mb-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
            <RefreshCw className="h-5 w-5" />
          </div>
        </motion.div>
        <p className="relative z-10 font-base text-muted-foreground">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-app-paper pb-20">
      <div className="pointer-events-none fixed inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />
      
      <header className="safe-top sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
              <Package className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg font-heading font-bold tracking-tight text-foreground">{t.courier.title}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            {isRefreshing && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            )}
            <Button variant="outline" size="sm" className="rounded-base" onClick={() => setIsWithdrawOpen(true)}>
              <Wallet className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-base">
                  <User className="mr-2 h-4 w-4" />
                  <span className="max-w-[120px] truncate">{formattedCourierBalance}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsChatOpen(true)} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{t.courier.chat}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab('profile')} className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{t.admin.settings}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  <span>{t.common.logout || 'Logout'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 mb-24 md:mb-6 space-y-6 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Main Desktop Navigation (Hidden on mobile, uses custom Gourmet list on desktop) */}
          <TabsList className="hidden md:grid h-auto w-full grid-cols-3 gap-2 rounded-base border-2 border-border bg-background p-1.5 mb-6">
            <TabsTrigger value="orders" className="flex items-center gap-2 rounded-base border-2 border-transparent text-[13px] font-heading data-[state=active]:border-border data-[state=active]:bg-main data-[state=active]:text-main-foreground">
              <Package className="w-4 h-4" />
              {t.courier.orders}
            </TabsTrigger>
            <div className="flex items-center justify-center">
              <Button variant="ghost" className="w-full gap-2 text-[13px] font-heading" onClick={() => setIsChatOpen(true)}>
                <MessageSquare className="w-4 h-4" />
                {t.courier.chat}
              </Button>
            </div>
            <TabsTrigger value="profile" className="flex items-center gap-2 rounded-base border-2 border-transparent text-[13px] font-heading data-[state=active]:border-border data-[state=active]:bg-main data-[state=active]:text-main-foreground">
              <User className="w-4 h-4" />
              {t.courier.profile}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card className="rounded-base border-2 border-border bg-card shadow-shadow">
              <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <p className="text-[11px] font-semibold text-indigo-600/70 dark:text-indigo-400/60 tracking-wider uppercase">{uiText.active}</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{activeOrdersCount}</p>
                </div>
                <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <p className="text-[11px] font-semibold text-amber-600/70 dark:text-amber-400/60 tracking-wider uppercase">{uiText.paused}</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pausedOrdersCount}</p>
                </div>
                <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                  <p className="text-[11px] font-semibold text-zinc-400 dark:text-white/35 tracking-wider uppercase mb-1">{uiText.lastSync}</p>
                  <p className="text-sm font-bold text-zinc-700 dark:text-white/80">{lastSyncLabel}</p>
                </div>
                <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-semibold text-emerald-600/70 dark:text-emerald-400/60 tracking-wider uppercase">{uiText.deliveryMomentum}</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{deliveryMomentum}%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{uiText.nextStop}</p>
                    {nextStopOrder ? (
                      <>
                        <p className="mt-1 text-base font-semibold">
                          #{nextStopOrder.orderNumber} {nextStopOrder.customer.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={
                              nextStopOrder.orderStatus === 'IN_DELIVERY'
                                ? 'border-border bg-main text-main-foreground'
                                : 'border-border bg-secondary-background text-foreground'
                            }
                          >
                            {nextStopOrder.orderStatus === 'IN_DELIVERY' ? uiText.inRoute : uiText.pending}
                          </Badge>
                          {nextStopDistanceLabel && (
                            <span className="text-xs text-muted-foreground">{nextStopDistanceLabel}</span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{nextStopOrder.deliveryAddress}</span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{uiText.noPendingStop}</p>
                    )}
                  </div>
                  {nextStopOrder && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="rounded-base" onClick={() => openRouteForOrder(nextStopOrder)}>
                        {uiText.navigate}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-base" onClick={() => handleOpenOrder(nextStopOrder)}>
                        {uiText.review}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5 text-foreground" />
                    {t.courier.todayOrders} ({orderedVisibleOrders.length}
                    {orderStatusFilter !== 'ALL' ? `/${orders.length}` : ''})
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {uiText.delivered}:{' '}
                      <span className="font-semibold text-emerald-600">{deliveredOrdersCount}</span>
                    </span>
                    <span>·</span>
                    <span>
                      {uiText.notDelivered}:{' '}
                      <span className="font-semibold text-rose-600">{notDeliveredOrdersCount}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <CalendarRangeSelector
                    value={dateRange}
                    onChange={setDateRange}
                    uiText={{
                      calendar: uiText.calendar,
                      today: uiText.today,
                      thisWeek: uiText.thisWeek,
                      thisMonth: uiText.thisMonth,
                      clearRange: uiText.clearRange,
                      allTime: uiText.allTime,
                    }}
                    locale={language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'}
                    className="min-w-[220px]"
                  />
                  <Button variant="outline" size="sm" className="rounded-base" onClick={() => fetchOrders(true)} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {uiText.refresh}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL' as const, label: `${uiText.all} (${orders.length})` },
                  { id: 'PENDING' as const, label: `${uiText.pending} (${pendingOrdersCount})` },
                  { id: 'IN_DELIVERY' as const, label: `${uiText.inRoute} (${inDeliveryOrdersCount})` },
                  { id: 'PAUSED' as const, label: `${uiText.paused} (${pausedOrdersCount})` },
                ].map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={orderStatusFilter === option.id ? 'default' : 'outline'}
                    className="rounded-base"
                    onClick={() => setOrderStatusFilter(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {orderedVisibleOrders.length > 0 && (
                <RouteOptimizeButton
                  orders={orderedVisibleOrders.map((o) => ({
                    id: o.id,
                    deliveryAddress: o.deliveryAddress,
                    latitude: o.latitude,
                    longitude: o.longitude,
                    customerName: o.customer.name,
                  }))}
                  onOptimized={(orderedIds) => {
                    const orderedOrders = orderedIds.map((id) => orders.find((o) => o.id === id)).filter(Boolean) as typeof orders
                    const untouchedOrders = orders.filter((order) => !orderedIds.includes(order.id))
                    setOrders([...orderedOrders, ...untouchedOrders])
                  }}
                  startPoint={currentLocation}
                  variant="outline"
                  size="sm"
                />
              )}

              <AnimatePresence mode="popLayout">
                {orderedVisibleOrders.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-base border-2 border-border bg-card py-12 text-center shadow-shadow">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">
                      {orderStatusFilter === 'ALL' ? t.courier.noOrders : uiText.noOrdersInStatus}
                    </h3>
                    <p className="text-muted-foreground">
                      {orderStatusFilter === 'ALL' ? t.courier.noOrders : uiText.tryAnotherStatus}
                    </p>
                    <Button onClick={() => fetchOrders()} variant="outline" className="mt-4">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {uiText.refresh}
                    </Button>
                  </motion.div>
                ) : (
                  orderedVisibleOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className={`overflow-hidden border-2 border-border shadow-shadow transition-colors duration-200 ${
                          order.orderStatus === 'DELIVERED' ? 'bg-secondary-background' : 'bg-card'
                        }`}
                        onClick={() => handleOpenOrder(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">#{order.orderNumber}</span>
                                {order.orderStatus === 'DELIVERED' && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {uiText.delivered}
                                  </Badge>
                                )}
                                {order.orderStatus === 'IN_DELIVERY' && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                    <Navigation className="w-3 h-3 mr-1" />
                                    {uiText.inRoute}
                                  </Badge>
                                )}
                                {order.orderStatus === 'PAUSED' && (
                                  <Badge variant="secondary" className="border-border bg-orange-300 text-black">
                                    <Pause className="w-3 h-3 mr-1" />
                                    {uiText.paused}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-foreground">{order.customer.name}</h3>
                              <div className="flex items-center text-muted-foreground text-sm">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1">{order.deliveryAddress}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-medium text-foreground">{order.deliveryTime}</div>
                              <div className="text-xs text-muted-foreground mt-1">{order.calories} kcal</div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                            <div className="flex items-center gap-4 text-sm text-foreground">
                              <div className="flex items-center">
                                <Utensils className="w-4 h-4 mr-1.5 text-muted-foreground" />
                                {order.quantity} {uiText.quantityUnit}
                              </div>
                              {order.specialFeatures && order.specialFeatures !== '{}' && (
                                <div className="flex items-center text-amber-600">
                                  <AlertCircle className="w-4 h-4 mr-1.5" />
                                  {uiText.notes}
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-foreground hover:text-foreground hover:bg-primary/5 -mr-2">
                              {uiText.details}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="profile">{courierData && <CourierProfile courier={courierData} />}</TabsContent>
        </Tabs>

        {/* Mobile Bottom Navigation - Matching Gourmet Design */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none md:hidden">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="max-w-md mx-auto pointer-events-auto"
          >
            <div className="bg-background/80 backdrop-blur-xl border-2 border-border rounded-[32px] p-2 shadow-2xl flex items-center justify-around">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${
                  activeTab === 'orders' ? 'bg-main text-main-foreground shadow-lg' : 'text-muted-foreground'
                }`}
              >
                <Package className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t.courier.orders}</span>
              </button>
              
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t.courier.chat}</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${
                  activeTab === 'profile' ? 'bg-main text-main-foreground shadow-lg' : 'text-muted-foreground'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t.courier.profile}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </main>
      <Sheet open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-base p-0">
          {selectedOrder && (
            <div className="h-full flex flex-col">
              <div className="p-6 pb-0">
                <SheetHeader className="mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 border-border text-muted-foreground">
                        #{selectedOrder.orderNumber}
                      </Badge>
                      <SheetTitle className="text-2xl font-bold text-foreground">{selectedOrder.customer.name}</SheetTitle>
                      <SheetDescription className="flex items-center mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {selectedOrder.deliveryTime}
                      </SheetDescription>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`px-3 py-1 ${
                          isOrderPaused
                            ? 'bg-orange-300 text-black'
                            : selectedOrder.orderStatus === 'IN_DELIVERY'
                              ? 'bg-main text-main-foreground'
                              : 'bg-emerald-300 text-black'
                        }`}
                      >
                        {isOrderPaused ? t.courier.pauseDelivery : selectedOrder.orderStatus === 'IN_DELIVERY' ? t.courier.activeOrder : uiText.new}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="flex items-start rounded-base border-2 border-border bg-secondary-background p-3">
                    <MapPin className="w-5 h-5 text-foreground mt-0.5 mr-3 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-0.5">{t.courier.deliveryAddress}</p>
                      <p className="font-medium text-foreground leading-snug">{selectedOrder.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center rounded-base border-2 border-border bg-secondary-background p-3">
                    <Phone className="w-5 h-5 text-foreground mr-3 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-0.5">{t.common.phone}</p>
                      <a href={`tel:${selectedOrder.customer.phone}`} className="font-medium text-foreground hover:text-foreground">
                        {selectedOrder.customer.phone}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                      <div className="flex items-center mb-1">
                        <Package className="w-4 h-4 text-foreground mr-2" />
                        <span className="text-xs text-muted-foreground">{t.common.quantity}</span>
                      </div>
                      <p className="font-semibold text-foreground">{selectedOrder.quantity} {uiText.quantityUnit}.</p>
                    </div>
                    <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                      <div className="flex items-center mb-1">
                        <Utensils className="w-4 h-4 text-foreground mr-2" />
                        <span className="text-xs text-muted-foreground">{t.common.calories}</span>
                      </div>
                      <p className="font-semibold text-foreground">{selectedOrder.calories}</p>
                    </div>
                  </div>

                  {selectedOrder.specialFeatures && selectedOrder.specialFeatures !== '{}' && (
                    <div className="rounded-base border-2 border-border bg-orange-300 p-3">
                      <div className="flex items-center mb-1 text-yellow-700">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium">{uiText.note}</span>
                      </div>
                      <p className="text-sm text-yellow-900">{selectedOrder.specialFeatures}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto p-6 bg-muted/50 border-t border-border space-y-3">
                {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') && (
                  <div className="mb-2 rounded-base border-2 border-border bg-card p-3 shadow-shadow">
                    <label className="mb-1 block text-sm font-medium text-foreground">{uiText.amountReceived}</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="0"
                        className="h-10 w-full pr-10"
                      />
                      <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">UZS</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 text-base font-medium" onClick={handleGetRoute}>
                    <Navigation className="w-5 h-5 mr-2" />
                    {t.courier.buildRoute}
                  </Button>

                  {selectedOrder.orderStatus === 'PENDING' && (
                    <Button className="h-12 text-base font-medium" onClick={handleStartDelivery}>
                      <Play className="w-5 h-5 mr-2" />
                      {t.courier.apply}
                    </Button>
                  )}

                  {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') &&
                    (isOrderPaused ? (
                      <Button className="h-12 text-base font-medium" onClick={handleResumeOrder}>
                        <Play className="w-5 h-5 mr-2" />
                        {t.courier.resumeDelivery}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="h-12 text-base font-medium"
                        onClick={handlePauseOrder}
                      >
                        <Pause className="w-5 h-5 mr-2" />
                        {t.courier.pauseDelivery}
                      </Button>
                    ))}
                </div>

                {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') && (
                  <Button
                    className="h-12 w-full text-base font-semibold"
                    onClick={handleCompleteDelivery}
                    disabled={isCompleting}
                  >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    {isCompleting ? t.common.loading : t.courier.completeDelivery}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw</DialogTitle>
            <DialogDescription>Current balance: {formattedCourierBalance}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              min={0}
              step="1"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="Amount (UZS)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)} disabled={isWithdrawing}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void handleWithdraw()} disabled={isWithdrawing}>
              {isWithdrawing ? t.common.loading : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        {/* Mobile PWA: full-screen dialog (like dispatch panel). Desktop: centered large modal. */}
        <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none h-[100svh] !rounded-none !border-0 gap-0 !p-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-[min(98dvh,1560px)] sm:max-w-[min(96vw,1600px)] md:h-[min(98dvh,1800px)] md:max-w-[min(98vw,1800px)] sm:!rounded-3xl sm:!border bg-background">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b bg-background/80 px-4 py-3 backdrop-blur flex justify-between items-center">
              <div>
                <DialogTitle>{t.courier.chat}</DialogTitle>
                <DialogDescription>{t.courier.chat}</DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)}>
                {t.common.cancel}
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatCenter initialShowUserList={true} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



