'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useLanguage, Language } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
]

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]
    const switcherLabel = language === 'uz' ? 'Til' : 'Язык'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 px-3"
                    aria-label={`${switcherLabel}: ${current.label}`}
                    title={`${switcherLabel}: ${current.label}`}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{current?.flag}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {LANGUAGES.map(({ code, label, flag }) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => setLanguage(code)}
                        className={`gap-2 ${language === code ? 'font-medium' : ''}`}
                    >
                        <span>{flag}</span>
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
