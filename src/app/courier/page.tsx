'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  MapPin,
  Phone,
  LogOut,
  Play,
  CheckCircle,
  Clock,
  Utensils,
  Pause,
  RefreshCw,
  Navigation,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  User,
  MessageSquare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { CourierProfile } from '@/components/courier/CourierProfile'
import { ChatTab } from '@/components/chat/ChatTab'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { RouteOptimizeButton } from '@/components/admin/RouteOptimizeButton'

// Dynamically import Map component to avoid SSR issues with Leaflet
const CourierMap = dynamic(() => import('@/components/courier/CourierMap'), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Загрузка карты...</div>
})

interface Order {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
  }
  deliveryAddress: string
  latitude: number
  longitude: number
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  orderStatus: string
  deliveryDate?: string
  createdAt: string
}

export default function CourierPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('orders')
  const [courierData, setCourierData] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [isOrderPaused, setIsOrderPaused] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')

  useEffect(() => {
    // Check authentication and load courier data
    const loadCourierData = async () => {
      // Try local storage first
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          setCourierData(user)
        } catch (e) {
          console.error("Failed to parse user data from localStorage", e)
        }
      }

      // Always fetch fresh profile data
      try {
        const response = await fetch('/api/courier/profile')
        if (response.ok) {
          const data = await response.json()
          setCourierData({
            id: data.id,
            name: data.name,
            email: data.email,
            role: 'COURIER' // Ensure role is set
          })
          // Update local storage
          localStorage.setItem('user', JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            role: 'COURIER'
          }))
        }
      } catch (error) {
        console.error('Error fetching courier profile:', error)
      }
    }

    loadCourierData()
    fetchOrders()
    getCurrentLocation()

    // Refresh location every 30 seconds
    const locationInterval = setInterval(getCurrentLocation, 30000)
    // Refresh orders every minute
    const ordersInterval = setInterval(() => fetchOrders(true), 60000)

    return () => {
      clearInterval(locationInterval)
      clearInterval(ordersInterval)
    }
  }, [])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to Tashkent center if location access denied
          if (!currentLocation) {
            setCurrentLocation({ lat: 41.2995, lng: 69.2401 })
          }
        }
      )
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180)
  }

  const fetchOrders = async (background = false) => {
    if (!background) setLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await fetch('/api/orders')

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const ordersData = await response.json()

        const activeAndPendingOrders = ordersData.filter((order: Order) =>
          order.orderStatus === 'PENDING' || order.orderStatus === 'IN_DELIVERY' || order.orderStatus === 'PAUSED'
        )
        setOrders(activeAndPendingOrders)

        const completedAndFailedOrders = ordersData.filter((order: Order) =>
          order.orderStatus === 'DELIVERED' || order.orderStatus === 'FAILED'
        )
        setHistoryOrders(completedAndFailedOrders)

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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'start_delivery' })
      })

      if (response.ok) {
        toast.success(t.courier.startDelivery, {
          description: t.courier.activeOrder
        })

        setOrders(prevOrders => prevOrders.map(o =>
          o.id === selectedOrder.id ? { ...o, orderStatus: 'IN_DELIVERY' } : o
        ))
        setSelectedOrder(prev => prev ? { ...prev, orderStatus: 'IN_DELIVERY' } : null)
        setIsOrderPaused(false)
      }
    } catch (error) {
      console.error('Error starting delivery:', error)
      toast.error(t.common.error)
    }
  }

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return

    const confirmClose = window.confirm(t.courier.completeDelivery + '?')
    if (!confirmClose) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'complete_delivery',
          amountReceived: amountReceived ? parseFloat(amountReceived) : null
        })
      })

      if (response.ok) {
        toast.success(t.common.success)
        handleCloseOrderDetailSheet()
        fetchOrders()
      }
    } catch (error) {
      console.error('Error completing delivery:', error)
      toast.error(t.common.error)
    }
  }

  const handlePauseOrder = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'pause_delivery' })
      })

      if (response.ok) {
        setIsOrderPaused(true)
        toast.info(t.courier.pauseDelivery)
        setOrders(prevOrders => prevOrders.map(o =>
          o.id === selectedOrder.id ? { ...o, orderStatus: 'PAUSED' } : o
        ))
        setSelectedOrder(prev => prev ? { ...prev, orderStatus: 'PAUSED' } : null)
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'resume_delivery' })
      })

      if (response.ok) {
        setIsOrderPaused(false)
        toast.success(t.courier.resumeDelivery)
        setOrders(prevOrders => prevOrders.map(o =>
          o.id === selectedOrder.id ? { ...o, orderStatus: 'IN_DELIVERY' } : o
        ))
        setSelectedOrder(prev => prev ? { ...prev, orderStatus: 'IN_DELIVERY' } : null)
      }
    } catch (error) {
      console.error('Error resuming delivery:', error)
      toast.error(t.common.error)
    }
  }

  const handleGetRoute = () => {
    if (!selectedOrder) return

    try {
      let destination = selectedOrder.deliveryAddress

      if (selectedOrder.latitude && selectedOrder.longitude) {
        destination = `${selectedOrder.latitude},${selectedOrder.longitude}`
      }

      // Use current location if available, otherwise let Google Maps decide (usually defaults to current location)
      let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`

      if (currentLocation) {
        url += `&origin=${currentLocation.lat},${currentLocation.lng}`
      }

      window.open(url, '_blank')
    } catch (error) {
      console.error('Error opening maps:', error)
      toast.error('Не удалось открыть карту')
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    await signOut({ callbackUrl: '/', redirect: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <RefreshCw className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-slate-500">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 safe-top">
        <div className="max-w-md mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg text-gradient">{t.courier.title}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            {isRefreshing && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </motion.div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-xl">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t.courier.orders}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t.courier.chat}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.courier.profile}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {/* Map Section */}
            <Card className="overflow-hidden border-none shadow-lg">
              <CardContent className="p-0 h-[300px] relative z-0">
                <CourierMap
                  orders={orders}
                  currentLocation={currentLocation}
                  onMarkerClick={handleOpenOrder}
                />
              </CardContent>
            </Card>

            {/* Orders List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {t.courier.todayOrders} ({orders.length})
              </h2>

              {orders.length > 0 && (
                <RouteOptimizeButton
                  orders={orders.map(o => ({
                    id: o.id,
                    deliveryAddress: o.deliveryAddress,
                    latitude: o.latitude,
                    longitude: o.longitude,
                    customerName: o.customer.name
                  }))}
                  onOptimized={(orderedIds) => {
                    const orderedOrders = orderedIds
                      .map(id => orders.find(o => o.id === id))
                      .filter(Boolean) as typeof orders;
                    setOrders(orderedOrders);
                  }}
                  startPoint={currentLocation}
                  variant="outline"
                  size="sm"
                />
              )}

              <AnimatePresence mode="popLayout">
                {orders.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white rounded-2xl shadow-sm"
                  >
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">{t.courier.noOrders}</h3>
                    <p className="text-slate-500">{t.courier.noOrders}</p>
                    <Button
                      onClick={() => fetchOrders()}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Обновить
                    </Button>
                  </motion.div>
                ) : (
                  orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className={`overflow-hidden border-none shadow-md transition-all duration-200 active:scale-[0.98] ${order.orderStatus === 'DELIVERED' ? 'bg-slate-50/50' : 'bg-white'
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
                                    Доставлен
                                  </Badge>
                                )}
                                {order.orderStatus === 'IN_DELIVERY' && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
                                    <Navigation className="w-3 h-3 mr-1" />
                                    В пути
                                  </Badge>
                                )}
                                {order.orderStatus === 'PAUSED' && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                    <Pause className="w-3 h-3 mr-1" />
                                    На паузе
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-slate-900">{order.customer.name}</h3>
                              <div className="flex items-center text-slate-500 text-sm">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1">{order.deliveryAddress}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-medium text-slate-900">{order.deliveryTime}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {order.calories} ккал
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center">
                                <Utensils className="w-4 h-4 mr-1.5 text-slate-400" />
                                {order.quantity} шт
                              </div>
                              {order.specialFeatures && order.specialFeatures !== '{}' && (
                                <div className="flex items-center text-amber-600">
                                  <AlertCircle className="w-4 h-4 mr-1.5" />
                                  Особенности
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5 -mr-2">
                              Подробнее
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

          <TabsContent value="chat">
            {courierData && <ChatTab />}
          </TabsContent>

          <TabsContent value="profile">
            {courierData && <CourierProfile courier={courierData} />}
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Detail Sheet */}
      <Sheet open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
          {selectedOrder && (
            <div className="h-full flex flex-col">
              <div className="p-6 pb-0">
                <SheetHeader className="mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 border-slate-200 text-slate-500">
                        #{selectedOrder.orderNumber}
                      </Badge>
                      <SheetTitle className="text-2xl font-bold text-slate-900">
                        {selectedOrder.customer.name}
                      </SheetTitle>
                      <SheetDescription className="flex items-center mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {selectedOrder.deliveryTime}
                      </SheetDescription>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`px-3 py-1 ${isOrderPaused ? 'bg-yellow-100 text-yellow-700' :
                          selectedOrder.orderStatus === 'IN_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}
                      >
                        {isOrderPaused ? t.courier.pauseDelivery :
                          selectedOrder.orderStatus === 'IN_DELIVERY' ? t.courier.activeOrder : 'New'}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="flex items-start p-3 bg-slate-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 mr-3 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500 mb-0.5">{t.courier.deliveryAddress}</p>
                      <p className="font-medium text-slate-900 leading-snug">
                        {selectedOrder.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                    <Phone className="w-5 h-5 text-primary mr-3 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500 mb-0.5">{t.common.phone}</p>
                      <a href={`tel:${selectedOrder.customer.phone}`} className="font-medium text-slate-900 hover:text-primary">
                        {selectedOrder.customer.phone}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center mb-1">
                        <Package className="w-4 h-4 text-primary mr-2" />
                        <span className="text-xs text-slate-500">{t.common.quantity}</span>
                      </div>
                      <p className="font-semibold text-slate-900">{selectedOrder.quantity} шт.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center mb-1">
                        <Utensils className="w-4 h-4 text-primary mr-2" />
                        <span className="text-xs text-slate-500">{t.common.calories}</span>
                      </div>
                      <p className="font-semibold text-slate-900">{selectedOrder.calories}</p>
                    </div>
                  </div>

                  {selectedOrder.specialFeatures && selectedOrder.specialFeatures !== '{}' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                      <div className="flex items-center mb-1 text-yellow-700">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium">Note</span>
                      </div>
                      <p className="text-sm text-yellow-900">{selectedOrder.specialFeatures}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100 space-y-3">

                {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-2">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Получено от клиента
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm">сум</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 text-base font-medium"
                    onClick={handleGetRoute}
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    {t.courier.buildRoute}
                  </Button>

                  {selectedOrder.orderStatus === 'PENDING' && (
                    <Button
                      className="h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleStartDelivery}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {t.courier.apply}
                    </Button>
                  )}

                  {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') && (
                    isOrderPaused ? (
                      <Button
                        className="h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleResumeOrder}
                      >
                        <Play className="w-5 h-5 mr-2" />
                        {t.courier.resumeDelivery}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="h-12 text-base font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        onClick={handlePauseOrder}
                      >
                        <Pause className="w-5 h-5 mr-2" />
                        {t.courier.pauseDelivery}
                      </Button>
                    )
                  )}
                </div>

                {(selectedOrder.orderStatus === 'IN_DELIVERY' || selectedOrder.orderStatus === 'PAUSED') && (
                  <Button
                    className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl"
                    onClick={handleCompleteDelivery}
                  >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    {t.courier.completeDelivery}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
