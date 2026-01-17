'use client'

import { useAdminSettingsContext } from '@/contexts/AdminSettingsContext'

export function useAdminSettings() {
    return useAdminSettingsContext()
}
