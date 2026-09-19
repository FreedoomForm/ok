'use client'

import { Button } from '@/components/ui/button'
import { useLanguage, Language } from '@/contexts/LanguageContext'
import { Languages } from 'lucide-react'

const LANGUAGES: Record<Language, { label: string; flag: string; next: Language; nextLabel: string }> = {
    ru: { label: 'Русский', flag: '🇷🇺', next: 'uz', nextLabel: "O'zbek" },
    uz: { label: "O'zbek", flag: '🇺🇿', next: 'ru', nextLabel: 'Русский' },
}

// Plan §2: single cycle button — press once RU→UZ, press again UZ→RU (English removed).
export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    const current = LANGUAGES[language]
    const title =
        language === 'uz'
            ? `Til: ${current.label} → ${current.nextLabel}`
            : `Язык: ${current.label} → ${current.nextLabel}`

    return (
        <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3"
            aria-label={title}
            title={title}
            data-language-cycle="true"
            data-current-language={language}
            onClick={() => setLanguage(current.next)}
        >
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{current.flag}</span>
        </Button>
    )
}
