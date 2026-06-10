'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toLocalIsoDate, parseLocalIsoDate, DASHBOARD_UI_STORAGE_PREFIX } from '@/features/admin-dashboard/model'
import type { DateRange } from 'react-day-picker'

export interface UseDashboardUiStateInput {
  mode: string
  selectedPeriod: DateRange | undefined
  selectedDate: Date | null
  activeTab: string
  visibleTabs: string[]
  applySelectedPeriod: (period: DateRange | undefined) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  showFilters: boolean
  setShowFilters: (v: boolean) => void
  searchTerm: string
  setSearchTerm: (v: string) => void
  clientSearchTerm: string
  setClientSearchTerm: (v: string) => void
  optimizeCourierId: string
  setOptimizeCourierId: (v: string) => void
  setSelectedDate: (d: Date | null) => void
  setSelectedPeriod: (p: DateRange | undefined) => void
  setDateCursor: (d: Date) => void
  setActiveTab: (tab: string) => void
}

export function useDashboardUiState(input: UseDashboardUiStateInput) {
  const {
    mode,
    selectedPeriod,
    selectedDate,
    activeTab,
    visibleTabs,
    applySelectedPeriod,
    searchInputRef,
    showFilters,
    setShowFilters,
    searchTerm,
    setSearchTerm,
    clientSearchTerm,
    setClientSearchTerm,
    optimizeCourierId,
    setOptimizeCourierId,
    setSelectedDate,
    setSelectedPeriod,
    setDateCursor,
    setActiveTab,
  } = input

  const [isUiStateHydrated, setIsUiStateHydrated] = useState(false)
  const uiStateStorageKey = `${DASHBOARD_UI_STORAGE_PREFIX}:${mode}`

  // ---------------------------------------------------------------------------
  // Hydrate UI state from localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isUiStateHydrated || typeof window === 'undefined') return

    try {
      const rawState = localStorage.getItem(uiStateStorageKey)
      if (!rawState) {
        setIsUiStateHydrated(true)
        return
      }

      const state = JSON.parse(rawState) as {
        selectedDateISO?: string | null
        selectedPeriodISO?: { from: string; to: string } | null
        showFilters?: boolean
        searchTerm?: string
        clientSearchTerm?: string
        optimizeCourierId?: string
      }

      if (typeof state.showFilters === 'boolean') setShowFilters(state.showFilters)
      if (typeof state.searchTerm === 'string') setSearchTerm(state.searchTerm.slice(0, 160))
      if (typeof state.clientSearchTerm === 'string') setClientSearchTerm(state.clientSearchTerm.slice(0, 160))
      if (typeof state.optimizeCourierId === 'string') setOptimizeCourierId(state.optimizeCourierId)
      if (state.selectedPeriodISO === null || state.selectedDateISO === null) {
        setSelectedPeriod(undefined)
        setSelectedDate(null)
        setDateCursor(new Date())
      } else if (state.selectedPeriodISO && typeof state.selectedPeriodISO === 'object') {
        const restoredFrom = parseLocalIsoDate(state.selectedPeriodISO.from)
        const restoredTo = parseLocalIsoDate(state.selectedPeriodISO.to)
        if (restoredFrom && restoredTo) {
          applySelectedPeriod({ from: restoredFrom, to: restoredTo })
        }
      } else if (typeof state.selectedDateISO === 'string') {
        const restoredDate = parseLocalIsoDate(state.selectedDateISO)
        if (restoredDate) {
          applySelectedPeriod({ from: restoredDate, to: restoredDate })
        }
      }
    } catch (error) {
      console.error('Unable to restore dashboard UI state:', error)
    } finally {
      setIsUiStateHydrated(true)
    }
  }, [applySelectedPeriod, isUiStateHydrated, uiStateStorageKey])

  // ---------------------------------------------------------------------------
  // Persist UI state to localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isUiStateHydrated || typeof window === 'undefined') return

    localStorage.setItem(
      uiStateStorageKey,
      JSON.stringify({
        selectedPeriodISO: selectedPeriod?.from
          ? {
              from: toLocalIsoDate(selectedPeriod.from),
              to: toLocalIsoDate(selectedPeriod.to ?? selectedPeriod.from),
            }
          : null,
        showFilters,
        searchTerm,
        clientSearchTerm,
        optimizeCourierId,
      })
    )
  }, [clientSearchTerm, isUiStateHydrated, optimizeCourierId, searchTerm, selectedPeriod, showFilters, uiStateStorageKey])

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isEditable = !!target && (target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && activeTab === 'orders') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (event.key === '/' && !isEditable && activeTab === 'orders') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (event.key === 'Escape') {
        if (showFilters) {
          setShowFilters(false)
          event.preventDefault()
          return
        }
        if (activeTab === 'orders' && searchTerm) {
          setSearchTerm('')
          event.preventDefault()
        }
      }

      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)) {
        const tab = visibleTabs[Number(event.key) - 1]
        if (tab) {
          event.preventDefault()
          setActiveTab(tab)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab, searchTerm, showFilters, visibleTabs])

  return { isUiStateHydrated, uiStateStorageKey }
}
