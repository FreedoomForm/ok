'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Download, Plus, Share2, Smartphone, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePWA } from '@/hooks/usePWA'

const PROMPT_DISMISS_KEY = 'pwa-prompt-dismissed-until'
const PROMPT_COOLDOWN_DAYS = 7
const PROMPT_DELAY_MS = 2200

const copyByLanguage = {
    ru: {
        title: 'Установите AutoFood',
        subtitle: 'Быстрый запуск и работа как приложение',
        installCta: 'Установить',
        laterCta: 'Позже',
        gotItCta: 'Понятно',
        installHint: 'Приложение будет открываться быстрее и удобнее на телефоне.',
        iosHintTitle: 'Установка на iPhone',
        iosHintStepOne: 'Откройте сайт в Safari.',
        iosHintStepTwo: 'Нажмите',
        iosHintStepThree: 'и выберите "На экран Домой".',
        installedTitle: 'Установлено',
        installedSubtitle: 'AutoFood готов к работе в режиме приложения.',
    },
    uz: {
        title: 'AutoFood ilovasini o‘rnating',
        subtitle: 'Tez ochilish va ilova kabi ishlash',
        installCta: 'O‘rnatish',
        laterCta: 'Keyinroq',
        gotItCta: 'Tushunarli',
        installHint: 'Ilova telefoningizda tezroq ochiladi va ishlash qulayroq bo‘ladi.',
        iosHintTitle: 'iPhone’da o‘rnatish',
        iosHintStepOne: 'Saytni Safari’da oching.',
        iosHintStepTwo: 'Tugmasini bosing',
        iosHintStepThree: 'va "Add to Home Screen" ni tanlang.',
        installedTitle: 'O‘rnatildi',
        installedSubtitle: 'AutoFood endi ilova rejimida ishlashga tayyor.',
    },
    en: {
        title: 'Install AutoFood',
        subtitle: 'Faster launch and app-like experience',
        installCta: 'Install',
        laterCta: 'Later',
        gotItCta: 'Got it',
        installHint: 'Install for quicker access and a cleaner mobile workflow.',
        iosHintTitle: 'Install on iPhone',
        iosHintStepOne: 'Open this website in Safari.',
        iosHintStepTwo: 'Tap',
        iosHintStepThree: 'then choose "Add to Home Screen".',
        installedTitle: 'Installed',
        installedSubtitle: 'AutoFood is ready in app mode.',
    },
} as const

export function PWAInstallPrompt() {
    const { language } = useLanguage()
    const { isInstallable, isInstalled, canShowIOSHint, installApp } = usePWA()
    const [showPrompt, setShowPrompt] = useState(false)
    const [installing, setInstalling] = useState(false)
    const [justInstalled, setJustInstalled] = useState(false)
    const [isMobileLike, setIsMobileLike] = useState(false)

    const copy = copyByLanguage[language]
    const isPromptEligible = (isInstallable || canShowIOSHint) && !isInstalled
    const showIOSInstructions = canShowIOSHint && !isInstallable

    useEffect(() => {
        const media = window.matchMedia('(max-width: 1024px), (pointer: coarse)')
        const update = () => setIsMobileLike(media.matches)
        update()
        media.addEventListener?.('change', update)
        return () => media.removeEventListener?.('change', update)
    }, [])

    useEffect(() => {
        const dismissedUntil = Number(localStorage.getItem(PROMPT_DISMISS_KEY) ?? '0')
        if (dismissedUntil > Date.now()) return

        if (!isPromptEligible || !isMobileLike) return

        const timer = window.setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS)
        return () => window.clearTimeout(timer)
    }, [isPromptEligible, isMobileLike])

    useEffect(() => {
        if (!isInstalled) return
        setJustInstalled(true)
        setShowPrompt(true)

        const timer = window.setTimeout(() => {
            setShowPrompt(false)
            setJustInstalled(false)
        }, 2600)

        return () => window.clearTimeout(timer)
    }, [isInstalled])

    const handleInstall = async () => {
        setInstalling(true)
        const success = await installApp()
        setInstalling(false)
        if (success) setJustInstalled(true)
    }

    const handleDismiss = () => {
        const dismissUntil = Date.now() + PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        localStorage.setItem(PROMPT_DISMISS_KEY, String(dismissUntil))
        setShowPrompt(false)
    }

    const cardStyle = useMemo(() => ({ bottom: 'calc(12px + env(safe-area-inset-bottom))' }), [])

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-x-3 z-50 md:inset-x-auto md:right-6 md:w-[22rem]"
                style={cardStyle}
            >
 <div className="overflow-hidden rounded-2xl bg-card shadow-elevated">
 <div className="flex items-start justify-between gap-3 bg-muted/50 p-4">
                        <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background">
                                {justInstalled ? <Check className="h-5 w-5 text-emerald-600" /> : <Smartphone className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{justInstalled ? copy.installedTitle : copy.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {justInstalled ? copy.installedSubtitle : copy.subtitle}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDismiss}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label="Dismiss PWA prompt"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {!justInstalled ? (
                        <div className="space-y-4 p-4">
                            {showIOSInstructions ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">{copy.iosHintTitle}</p>
                                    <p className="text-sm text-muted-foreground">{copy.iosHintStepOne}</p>
 <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
                                        <span>{copy.iosHintStepTwo}</span>
                                        <Share2 className="h-4 w-4" />
                                        <span>{copy.iosHintStepThree}</span>
                                        <Plus className="ml-auto h-4 w-4" />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{copy.installHint}</p>
                            )}

                            <div className="flex gap-2">
                                {!showIOSInstructions ? (
                                    <Button onClick={handleInstall} disabled={installing} className="flex-1">
                                        {installing ? (
                                            <span className="inline-flex items-center gap-2">
 <span className="h-4 w-4 animate-spin rounded-full" />
                                                {copy.installCta}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2">
                                                <Download className="h-4 w-4" />
                                                {copy.installCta}
                                            </span>
                                        )}
                                    </Button>
                                ) : null}
                                <Button variant="outline" onClick={handleDismiss} className="flex-1">
                                    {showIOSInstructions ? copy.gotItCta : copy.laterCta}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
