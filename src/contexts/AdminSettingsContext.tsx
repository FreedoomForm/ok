'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface AdminSettings {
    compactMode: boolean
    showStats: boolean
    enableAnimations: boolean
    theme: 'light' | 'dark' | 'system'
}

const DEFAULT_SETTINGS: AdminSettings = {
    compactMode: false,
    showStats: true,
    enableAnimations: true,
    theme: 'light'
}

interface AdminSettingsContextType {
    settings: AdminSettings
    updateSettings: (newSettings: Partial<AdminSettings>) => void
    mounted: boolean
}

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined)

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedSettings = localStorage.getItem('adminSettings')
        if (savedSettings) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
            } catch (e) {
                console.error('Failed to parse admin settings', e)
            }
        }
        setMounted(true)
    }, [])

    const updateSettings = (newSettings: Partial<AdminSettings>) => {
        const updated = { ...settings, ...newSettings }
        setSettings(updated)
        localStorage.setItem('adminSettings', JSON.stringify(updated))

        // Apply theme
        if (newSettings.theme) {
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')

            if (newSettings.theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                root.classList.add(systemTheme)
            } else {
                root.classList.add(newSettings.theme)
            }
        }
    }

    // Initial theme application
    useEffect(() => {
        if (mounted) {
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')

            if (settings.theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                root.classList.add(systemTheme)
            } else {
                root.classList.add(settings.theme)
            }
        }
    }, [mounted, settings.theme])

    return (
        <AdminSettingsContext.Provider value={{ settings, updateSettings, mounted }}>
            {children}
        </AdminSettingsContext.Provider>
    )
}

export function useAdminSettingsContext() {
    const context = useContext(AdminSettingsContext)
    if (context === undefined) {
        throw new Error('useAdminSettingsContext must be used within a AdminSettingsProvider')
    }
    return context
}
