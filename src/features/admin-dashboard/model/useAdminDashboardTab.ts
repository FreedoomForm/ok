'use client'

import { useEffect, useMemo, useState } from 'react'

import { CANONICAL_TABS, deriveVisibleTabs } from '@/components/admin/dashboard/tabs'
import { DASHBOARD_UI_STORAGE_PREFIX } from './admin-dashboard.constants'
import type { AdminDashboardMode } from './admin-dashboard.types'

// ---------------------------------------------------------------------------
// Hook options & return type
// ---------------------------------------------------------------------------

export interface UseAdminDashboardTabOptions {
  /** Dashboard mode — determines the default tab. */
  mode: AdminDashboardMode
  /** Role returned by `useDashboardData`. Used to derive `isMiddleAdminView`. */
  meRole: string | undefined
  /** `allowedTabs` returned by `useDashboardData`. */
  allowedTabs: string[] | undefined
}

export interface UseAdminDashboardTabReturn {
  activeTab: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  visibleTabs: string[]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the admin dashboard's active tab, the derived list of visible
 * tabs (based on role / permissions), tab auto-correction, and tab
 * persistence to localStorage.
 */
export function useAdminDashboardTab({
  mode,
  meRole,
  allowedTabs,
}: UseAdminDashboardTabOptions): UseAdminDashboardTabReturn {
  // ---- activeTab ----------------------------------------------------------

  const [activeTab, setActiveTab] = useState<string>(() =>
    mode === 'middle' ? 'orders' : 'statistics',
  )

  // ---- visibleTabs --------------------------------------------------------

  const isMiddleAdminView = mode === 'middle' || meRole === 'MIDDLE_ADMIN'

  const visibleTabs = useMemo(() => {
    const derivedTabs = Array.isArray(allowedTabs)
      ? deriveVisibleTabs(allowedTabs)
      : [...(CANONICAL_TABS as unknown as string[])]

    const withoutInterface = derivedTabs.filter((tab) => tab !== 'interface')
    return isMiddleAdminView
      ? withoutInterface.filter((tab) => tab !== 'statistics')
      : withoutInterface
  }, [allowedTabs, isMiddleAdminView])

  // ---- auto-correct activeTab when visibleTabs change ---------------------

  useEffect(() => {
    if (visibleTabs.length === 0) return
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0])
    }
  }, [activeTab, visibleTabs])

  // ---- tab persistence to localStorage ------------------------------------

  const tabStorageKey = useMemo(
    () => `${DASHBOARD_UI_STORAGE_PREFIX}:tab:${mode}`,
    [mode],
  )

  // Hydrate activeTab from localStorage on mount
  const [isTabHydrated, setIsTabHydrated] = useState(false)

  useEffect(() => {
    if (isTabHydrated || typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(tabStorageKey)
      if (typeof stored === 'string' && stored.length > 0) {
        setActiveTab(stored)
      }
    } catch {
      // Silently ignore localStorage errors
    } finally {
      setIsTabHydrated(true)
    }
  }, [isTabHydrated, tabStorageKey])

  // Write activeTab to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!isTabHydrated || typeof window === 'undefined') return
    try {
      localStorage.setItem(tabStorageKey, activeTab)
    } catch {
      // Silently ignore localStorage errors
    }
  }, [activeTab, isTabHydrated, tabStorageKey])

  return { activeTab, setActiveTab, visibleTabs }
}
