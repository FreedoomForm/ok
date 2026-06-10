'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Admin, Client, Order, Stats } from '@/components/admin/dashboard/types'
import type { DateRange } from 'react-day-picker'

// ── View API response types (mirrors src/views/dashboard.view.ts) ───────────

interface SectionError {
  _error: string
}

interface DashboardOverview {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  allowedTabs: string[] | null
}

interface DashboardCourier {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  allowedTabs: string[]
  salary: number
  latitude: number | null
  longitude: number | null
}

interface DashboardClient {
  id: string
  name: string
  nickName: string | null
  phone: string
  address: string
  calories: number
  planType: string
  dailyPrice: number
  balance: number
  notes: string
  specialFeatures: string
  deliveryDays: Record<string, boolean>
  autoOrdersEnabled: boolean
  isActive: boolean
  createdAt: string
  deletedAt?: string
  deletedBy?: string
  defaultCourierId: string | null
  defaultCourierName: string | null
  assignedSetId: string | null
  assignedSetName: string | null
  latitude: number | null
  longitude: number | null
}

interface DashboardSet {
  id: string
  name: string
  description: string | null
  menuNumber: number
  calorieGroups: unknown
  isActive: boolean
  createdAt: string
  updatedAt: string
  adminId: string | null
}

interface DashboardViewData {
  overview?: DashboardOverview | SectionError
  stats?: Stats | SectionError
  orders?: Order[] | SectionError
  clients?: DashboardClient[] | SectionError
  couriers?: DashboardCourier[] | SectionError
  sets?: DashboardSet[] | SectionError
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type DashboardFilters = Record<string, unknown>

function isAbortError(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError'
}

function isSectionError(value: unknown): value is SectionError {
  return typeof value === 'object' && value !== null && '_error' in value
}

// ── Hook ────────────────────────────────────────────────────────────────────

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

  // ── B0: Current admin info ──────────────────────────────────────────────

  const loadMe = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/me', { signal })
      if (!res.ok) return
      const json = await res.json().catch(() => null)
      const data = json?.data
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

  // ── Granular refresh functions (kept for individual refreshes) ──────────

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
        const json = await response.json()
        setBinOrders(json?.data ?? json)
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
        const json = await response.json()
        setBinClients(json?.data ?? json)
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching bin clients:', error)
    }
  }, [])

  // ── View API: loadDashboardView ─────────────────────────────────────────
  //
  // Calls the aggregated BFF endpoint. On success, populates all states.
  // On failure (network error, non-2xx, or malformed response), returns
  // false so the caller can fall back to individual API calls.

  const loadDashboardView = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    const toLocalIsoDate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const params = new URLSearchParams()
    params.set('sections', 'overview,stats,orders,clients,couriers,sets')
    if (selectedPeriod?.from) {
      params.set('from', toLocalIsoDate(selectedPeriod.from))
      params.set('to', toLocalIsoDate(selectedPeriod.to ?? selectedPeriod.from))
    }
    if (filters && Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters))
    }

    try {
      const res = await fetch(`/api/admin/views/dashboard?${params.toString()}`, { signal })
      if (!res.ok) return false

      const json = await res.json()
      const viewData: DashboardViewData | undefined = json?.data
      if (!viewData || typeof viewData !== 'object') return false

      // ── Apply each section, skipping SectionErrors ──

      if (viewData.overview && !isSectionError(viewData.overview)) {
        setMeRole(viewData.overview.role)
        setAllowedTabs(viewData.overview.allowedTabs)
      }

      if (viewData.stats && !isSectionError(viewData.stats)) {
        setStats(viewData.stats)
      }

      if (viewData.orders && !isSectionError(viewData.orders)) {
        setOrders(viewData.orders)
      }

      if (viewData.clients && !isSectionError(viewData.clients)) {
        // Map DashboardClient → Client (the dashboard types expect this shape)
        setClients(viewData.clients as unknown as Client[])
      }

      if (viewData.couriers && !isSectionError(viewData.couriers)) {
        setCouriers(viewData.couriers as unknown as Admin[])
      }

      if (viewData.sets && !isSectionError(viewData.sets)) {
        setAvailableSets(viewData.sets)
      }

      return true
    } catch (error) {
      if (isAbortError(error)) return false
      console.error('[useDashboardData] View API failed, will fallback:', error)
      return false
    }
  }, [selectedPeriod, filters])

  // ── Legacy refreshAll (fallback when View API is unavailable) ───────────

  const refreshAllLegacy = useCallback(async (signal: AbortSignal) => {
    await refreshLowAdmins(signal)

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

    const [ordersRes, clientsRes, statsRes, couriersRes, setsRes] = await Promise.all([
      fetch(ordersUrl, { signal }),
      fetch('/api/admin/clients', { signal }),
      fetch('/api/admin/statistics', { signal }),
      fetch('/api/admin/couriers', { signal }),
      fetch('/api/admin/sets', { signal }),
    ])

    if (ordersRes.status === 401 || clientsRes.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }

    if (ordersRes.ok) { const j = await ordersRes.json(); setOrders(j?.data ?? j) }
    if (clientsRes.ok) { const j = await clientsRes.json(); setClients(j?.data ?? j) }
    if (statsRes.ok) { const j = await statsRes.json(); setStats(j?.data ?? j) }
    if (couriersRes.ok) setCouriers(await couriersRes.json())
    if (setsRes.ok) setAvailableSets(await setsRes.json())

    await refreshBinClients(signal)
    await refreshBinOrders(signal)
  }, [filters, refreshBinClients, refreshBinOrders, refreshLowAdmins, selectedPeriod])

  // ── Main refreshAll: View API → fallback to legacy ─────────────────────

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

      // Try the aggregated View API first
      const viewSuccess = await Promise.race([
        loadDashboardView(signal),
        timeoutPromise,
      ])

      if (viewSuccess) {
        // View API succeeded — still need low-admins and bin data (not in view)
        await Promise.race([
          Promise.all([
            refreshLowAdmins(signal),
            refreshBinClients(signal),
            refreshBinOrders(signal),
          ]),
          timeoutPromise,
        ])
      } else {
        // View API failed — fall back to individual calls
        await Promise.race([refreshAllLegacy(signal), timeoutPromise])
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching data:', error)
      toast.error('Ошибка загрузки данных', {
        description: error instanceof Error ? error.message : 'Проверьте соединение с интернетом',
      })
    } finally {
      setIsLoading(false)
    }
  }, [loadDashboardView, refreshAllLegacy, refreshBinClients, refreshBinOrders, refreshLowAdmins])

  // ── Effects ─────────────────────────────────────────────────────────────

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
