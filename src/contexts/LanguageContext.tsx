'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, Language } from '@/lib/translations'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: typeof translations['ru']
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('ru')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedLang = localStorage.getItem('language') as Language
        if (savedLang && ['ru', 'uz', 'en'].includes(savedLang)) {
            setLanguage(savedLang)
        }
        setMounted(true)
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('language', lang)
    }

    const value = {
        language,
        setLanguage: handleSetLanguage,
        t: translations[language]
    }

    // Prevent hydration mismatch by rendering children only after mount
    // or rendering with default language but being aware of potential mismatch
    // For simplicity in this app, we'll just render children. 
    // Ideally we'd use a loading state or similar if strict hydration match is needed.

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
