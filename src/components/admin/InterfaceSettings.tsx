'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useAdminSettings } from '@/hooks/useAdminSettings'
import { Save, Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

export function InterfaceSettings() {
    const { settings, updateSettings, mounted } = useAdminSettings()
    const { t, language } = useLanguage()
    const [isSaving, setIsSaving] = useState(false)
    const hasLoadedServerSettings = useRef(false)

    useEffect(() => {
        if (!mounted || hasLoadedServerSettings.current) return
        hasLoadedServerSettings.current = true
        let cancelled = false
        void fetch('/api/admin/settings').then((response) => response.ok ? response.json() : null).then((data: unknown) => {
            if (!cancelled && data && typeof data === 'object' && 'settings' in data && data.settings && typeof data.settings === 'object') {
                updateSettings(data.settings as Partial<typeof settings>)
            }
        }).catch(() => undefined)
        return () => { cancelled = true }
    }, [mounted])

    if (!mounted) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
            if (!response.ok) throw new Error('settings save failed')
            toast.success(t.admin.settingsSaved)
        } catch {
            toast.error(language === 'uz' ? 'Sozlamalar saqlanmadi' : 'Не удалось сохранить настройки')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="grid gap-6">
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>{t.admin.interface}</CardTitle>
                    <CardDescription>
                        {t.admin.settings}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="compact-mode">{t.admin.compactMode}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t.admin.compactModeDesc}
                            </p>
                        </div>
                        <Switch
                            id="compact-mode"
                            aria-label={t.admin.compactMode}
                            checked={settings.compactMode}
                            onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="show-stats">{t.admin.showStats}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t.admin.showStatsDesc}
                            </p>
                        </div>
                        <Switch
                            id="show-stats"
                            aria-label={t.admin.showStats}
                            checked={settings.showStats}
                            onCheckedChange={(checked) => updateSettings({ showStats: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="animations">{t.admin.animations}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t.admin.animationsDesc}
                            </p>
                        </div>
                        <Switch
                            id="animations"
                            aria-label={t.admin.animations}
                            checked={settings.enableAnimations}
                            onCheckedChange={(checked) => updateSettings({ enableAnimations: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>{t.admin.theme}</CardTitle>
                    <CardDescription>
                        {t.admin.themeDesc}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <Button
                            variant={settings.theme === 'light' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => updateSettings({ theme: 'light' })}
                        >
                            <Sun className="mr-2 h-4 w-4" />
                            {t.admin.light}
                        </Button>
                        <Button
                            variant={settings.theme === 'dark' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => updateSettings({ theme: 'dark' })}
                        >
                            <Moon className="mr-2 h-4 w-4" />
                            {t.admin.dark}
                        </Button>
                        <Button
                            variant={settings.theme === 'system' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => updateSettings({ theme: 'system' })}
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            {t.admin.system}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={() => void handleSave()} disabled={isSaving} className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    {t.admin.saveSettings}
                </Button>
            </div>
        </div>
    )
}

