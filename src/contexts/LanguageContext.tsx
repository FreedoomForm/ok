'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Language } from '@/lib/translations'

export type { Language } from '@/lib/translations'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: typeof translations['ru']
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('ru')

    useEffect(() => {
        const savedLang = localStorage.getItem('language')
        if (savedLang === 'ru' || savedLang === 'uz') {
            setLanguage(savedLang)
        } else if (savedLang === 'en') {
            // Legacy stored value: the RU/UZ-only contract migrated it to Russian.
            localStorage.setItem('language', 'ru')
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        const supportedLanguage: Language = lang === 'uz' ? 'uz' : 'ru'
        setLanguage(supportedLanguage)
        localStorage.setItem('language', supportedLanguage)
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
