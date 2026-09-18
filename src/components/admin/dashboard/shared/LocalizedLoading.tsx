'use client'

import { useLanguage } from '@/contexts/LanguageContext'

// Addendum §13: RU/UZ is the only language toggle — every user-visible
// fallback copy, including dynamic-import loading placeholders, must follow
// the selected locale instead of rendering hardcoded English.
export function LocalizedLoading({ className = 'p-4 text-sm text-muted-foreground' }: { className?: string }) {
    const { language } = useLanguage()
    return <div className={className}>{language === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}</div>
}
