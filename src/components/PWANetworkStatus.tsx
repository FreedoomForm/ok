'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

const copy = {
  ru: {
    offline: 'Нет подключения к интернету',
    online: 'Подключение восстановлено',
    retry: 'Повторить',
  },
  uz: {
    offline: 'Internet aloqasi yo‘q',
    online: 'Aloqa qayta tiklandi',
    retry: 'Qayta urinish',
  },
  en: {
    offline: 'No internet connection',
    online: 'Connection restored',
    retry: 'Retry',
  },
} as const

export function PWANetworkStatus() {
  const { language } = useLanguage()
  const [isOnline, setIsOnline] = useState(true)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      window.setTimeout(() => setShowRestored(false), 1800)
    }

    const handleOffline = () => {
      setShowRestored(false)
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const t = copy[language]
  const visible = !isOnline || showRestored
  const isError = !isOnline
  const shellClass = useMemo(
    () =>
      isError
 ? ' bg-slate-500/10 text-slate-200'
 : ' bg-neutral-500/10 text-neutral-200',
    [isError]
  )

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[60] w-[calc(100%-1rem)] max-w-md -translate-x-1/2"
        >
          <div
 className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-3 py-2 shadow-elevated backdrop-blur ${shellClass}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {isError ? <WifiOff className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <p className="truncate text-sm font-medium">{isError ? t.offline : t.online}</p>
            </div>

            {isError ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={() => window.location.reload()}
              >
                {t.retry}
              </Button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

