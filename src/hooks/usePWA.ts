'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function detectStandaloneMode() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as NavigatorWithStandalone).standalone)
    )
}

function detectIOSDevice() {
    const userAgent = window.navigator.userAgent.toLowerCase()
    const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return /iphone|ipad|ipod/.test(userAgent) || touchMac
}

export function usePWA() {
    const [isInstallable, setIsInstallable] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIOSDevice, setIsIOSDevice] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

    useEffect(() => {
        setIsIOSDevice(detectIOSDevice())
        setIsInstalled(detectStandaloneMode())

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsInstallable(true)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setIsInstallable(false)
            setDeferredPrompt(null)
        }

        const handleDisplayModeChange = () => {
            setIsInstalled(detectStandaloneMode())
        }

        const media = window.matchMedia('(display-mode: standalone)')
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)
        media.addEventListener?.('change', handleDisplayModeChange)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
            media.removeEventListener?.('change', handleDisplayModeChange)
        }
    }, [])

    const installApp = async () => {
        if (!deferredPrompt) return false

        try {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === 'accepted') {
                setIsInstalled(true)
                setIsInstallable(false)
            }

            setDeferredPrompt(null)
            return outcome === 'accepted'
        } catch (error) {
            void error
            return false
        }
    }

    return {
        isInstallable,
        isInstalled,
        isIOSDevice,
        canShowIOSHint: isIOSDevice && !isInstalled && !isInstallable,
        installApp
    }
}
