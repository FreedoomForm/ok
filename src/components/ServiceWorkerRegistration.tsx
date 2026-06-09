'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

        let updateInterval: number | null = null
        let didReloadAfterUpdate = false
        let addLoadListener = false

        const showUpdateToast = (worker: ServiceWorker) => {
            toast.info('New app update is ready', {
                description: 'Reload to apply the latest mobile and offline improvements.',
                action: {
                    label: 'Reload',
                    onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
                },
                duration: 12000,
            })
        }

        const handleControllerChange = () => {
            if (didReloadAfterUpdate) return
            didReloadAfterUpdate = true
            window.location.reload()
        }

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js')

                if (registration.waiting) {
                    showUpdateToast(registration.waiting)
                }

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing
                    if (!installingWorker) return

                    installingWorker.addEventListener('statechange', () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateToast(installingWorker)
                        }
                    })
                })

                updateInterval = window.setInterval(() => {
                    void registration.update()
                }, UPDATE_CHECK_INTERVAL_MS)
            } catch (error) {
                void error
            }
        }

        if (document.readyState === 'complete') {
            void registerServiceWorker()
        } else {
            addLoadListener = true
            const onLoad = () => void registerServiceWorker()
            window.addEventListener('load', onLoad, { once: true })
            return () => {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
                if (updateInterval) window.clearInterval(updateInterval)
                if (addLoadListener) window.removeEventListener('load', onLoad)
            }
        }

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
            if (updateInterval) window.clearInterval(updateInterval)
        }
    }, [])

    return null
}
