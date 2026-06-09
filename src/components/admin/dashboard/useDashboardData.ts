'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Admin, Client, Order, Stats } from '@/components/admin/dashboard/types'
import type { DateRange } from 'react-day-picker'

type DashboardFilters = Record<string, unknown>

function isAbortError(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError'
}

export function useDashboardData({
  selectedPeriod,
  filters,
}: {
  selectedPeriod: DateRange | undefined
  filters: DashboardFilters
}) {
  const [meRole, setMeRole] = useState<string | null>(null)
  const [allowedTabs, setAllowedTabs] = useState<string[] | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [lowAdmins, setLowAdmins] = useState<Admin[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [couriers, setCouriers] = useState<Admin[]>([])
  const [binClients, setBinClients] = useState<Client[]>([])
  const [binOrders, setBinOrders] = useState<Order[]>([])
  const [availableSets, setAvailableSets] = useState<any[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const didInitialRefreshRef = useRef(false)

  const loadMe = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/me', { signal })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      setMeRole(data && typeof data.role === 'string' ? data.role : null)
      setAllowedTabs(
        data && Array.isArray(data.allowedTabs)
          ? data.allowedTabs.filter((tab: unknown): tab is string => typeof tab === 'string')
          : null
      )
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching permissions:', error)
    }
  }, [])

  const refreshLowAdmins = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/low-admins', { signal })
      if (response.ok) {
        const adminsData = await response.json()
        setLowAdmins(adminsData)
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching low admins:', error)
    }
  }, [])

  const refreshBinOrders = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/orders?deletedOnly=true', { signal })
      if (response.ok) {
        const data = await response.json()
        setBinOrders(data)
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching bin orders:', error)
    }
  }, [])

  const refreshBinClients = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/clients/bin', { signal })
      if (response.ok) {
        const data = await response.json()
        setBinClients(data)
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching bin clients:', error)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    if (typeof window === 'undefined') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    setIsLoading(true)
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      )

      await Promise.race([refreshLowAdmins(signal), timeoutPromise])

      const toLocalIsoDate = (d: Date) => {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }

      const ordersUrl = selectedPeriod?.from
        ? `/api/orders?from=${encodeURIComponent(toLocalIsoDate(selectedPeriod.from))}&to=${encodeURIComponent(
            toLocalIsoDate(selectedPeriod.to ?? selectedPeriod.from)
          )}&filters=${encodeURIComponent(JSON.stringify(filters))}`
        : `/api/orders?filters=${encodeURIComponent(JSON.stringify(filters))}`

      const fetchPromise = Promise.all([
        fetch(ordersUrl, { signal }),
        fetch('/api/admin/clients', { signal }),
        fetch('/api/admin/statistics', { signal }),
        fetch('/api/admin/couriers', { signal }),
        fetch('/api/admin/sets', { signal }),
      ])

      const [ordersRes, clientsRes, statsRes, couriersRes, setsRes] = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as [Response, Response, Response, Response, Response]

      if (ordersRes.status === 401 || clientsRes.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }

      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      if (couriersRes.ok) setCouriers(await couriersRes.json())
      if (setsRes.ok) setAvailableSets(await setsRes.json())

      await refreshBinClients(signal)
      await refreshBinOrders(signal)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching data:', error)
      toast.error('Ошибка загрузки данных', {
        description: error instanceof Error ? error.message : 'Проверьте соединение с интернетом',
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, refreshBinClients, refreshBinOrders, refreshLowAdmins, selectedPeriod])

  useEffect(() => {
    const controller = new AbortController()
    loadMe(controller.signal)
    return () => controller.abort()
  }, [loadMe])

  useEffect(() => {
    if (!didInitialRefreshRef.current) {
      didInitialRefreshRef.current = true
      refreshAll()
      return
    }

    const timer = setTimeout(() => {
      refreshAll()
    }, 220)

    return () => clearTimeout(timer)
  }, [refreshAll])

  return {
    meRole,
    allowedTabs,
    isLoading,
    lowAdmins,
    orders,
    setOrders,
    clients,
    couriers,
    availableSets,
    stats,
    binClients,
    binOrders,
    refreshAll,
    refreshLowAdmins,
    refreshBinClients,
    refreshBinOrders,
  }
}
