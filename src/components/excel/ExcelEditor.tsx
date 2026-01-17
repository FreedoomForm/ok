'use client'

import { useState, useCallback } from 'react'
import { TabBar } from './TabBar'
import { Sheet } from './Sheet'
import { Toolbar } from './Toolbar'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface ExcelEditorProps {
    adminId: string
    onAIAssist?: () => void
}

export function ExcelEditor({ adminId, onAIAssist }: ExcelEditorProps) {
    const [activeTabId, setActiveTabId] = useState<string | null>(null)
    const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const handleTabChange = useCallback((tabId: string, sheetId: string) => {
        setActiveTabId(tabId)
        setActiveSheetId(sheetId)
    }, [])

    const handleSave = useCallback(async () => {
        setIsSaving(true)
        try {
            // Data is auto-saved to Firestore, this is just for manual save confirmation
            await new Promise(r => setTimeout(r, 500))
            toast.success('Все изменения сохранены')
        } catch (error) {
            toast.error('Ошибка сохранения')
        } finally {
            setIsSaving(false)
        }
    }, [])

    const handleUndo = useCallback(() => {
        // TODO: Implement undo with Firestore history
        toast.info('Отмена действия (в разработке)')
    }, [])

    const handleRedo = useCallback(() => {
        // TODO: Implement redo with Firestore history
        toast.info('Повтор действия (в разработке)')
    }, [])

    return (
        <Card className="flex flex-col h-[calc(100vh-200px)] overflow-hidden">
            {/* Toolbar */}
            <Toolbar
                onSave={handleSave}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onAIAssist={onAIAssist}
                isSaving={isSaving}
            />

            {/* Tab Bar */}
            <TabBar
                adminId={adminId}
                activeTabId={activeTabId}
                onTabChange={handleTabChange}
            />

            {/* Sheet Content */}
            {activeSheetId ? (
                <Sheet adminId={adminId} sheetId={activeSheetId} />
            ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <div className="text-center">
                        <p className="text-lg font-medium mb-2">Нет активной вкладки</p>
                        <p className="text-sm">Создайте новую вкладку для начала работы</p>
                    </div>
                </div>
            )}
        </Card>
    )
}
