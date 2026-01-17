'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Language } from '@/lib/translations'

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'ru', label: 'Русский', flag: '🇷🇺' },
        { code: 'uz', label: 'O\'zbek', flag: '🇺🇿' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
    ]

    const currentLang = languages.find(l => l.code === language)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 px-0">
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={language === lang.code ? 'bg-accent' : ''}
                    >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
