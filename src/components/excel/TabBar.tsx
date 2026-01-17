'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Plus,
    Trash2,
    Edit2,
    X,
    Check,
    GripVertical,
    ChevronDown,
    Settings
} from 'lucide-react'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useTabs } from '@/hooks/useFirestore'

interface TabBarProps {
    adminId: string
    activeTabId: string | null
    onTabChange: (tabId: string, sheetId: string) => void
}

export function TabBar({ adminId, activeTabId, onTabChange }: TabBarProps) {
    const { tabs, loading, addTab, renameTab, removeTab } = useTabs(adminId)
    const [editingTabId, setEditingTabId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [newTabName, setNewTabName] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // Select first tab by default
    useEffect(() => {
        if (!activeTabId && tabs.length > 0) {
            onTabChange(tabs[0].id, tabs[0].sheetId)
        }
    }, [tabs, activeTabId, onTabChange])

    const handleAddTab = async () => {
        if (!newTabName.trim()) return
        await addTab(newTabName.trim())
        setNewTabName('')
        setIsAdding(false)
    }

    const handleStartRename = (tabId: string, currentName: string) => {
        setEditingTabId(tabId)
        setEditingName(currentName)
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleRename = async () => {
        if (editingTabId && editingName.trim()) {
            await renameTab(editingTabId, editingName.trim())
        }
        setEditingTabId(null)
        setEditingName('')
    }

    const handleDelete = async (tabId: string) => {
        if (confirm('Вы уверены, что хотите удалить эту вкладку?')) {
            await removeTab(tabId)
            if (activeTabId === tabId && tabs.length > 1) {
                const remaining = tabs.filter(t => t.id !== tabId)
                if (remaining.length > 0) {
                    onTabChange(remaining[0].id, remaining[0].sheetId)
                }
            }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center h-10 px-2 border-b bg-muted/30">
                <div className="animate-pulse bg-muted h-6 w-24 rounded" />
            </div>
        )
    }

    return (
        <div className="flex items-center h-10 border-b bg-muted/30 overflow-x-auto">
            <div className="flex items-center gap-1 px-2">
                {tabs.map((tab) => (
                    <ContextMenu key={tab.id}>
                        <ContextMenuTrigger>
                            <div
                                onClick={() => onTabChange(tab.id, tab.sheetId)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
                                    transition-colors text-sm font-medium
                                    ${activeTabId === tab.id
                                        ? 'bg-background text-foreground border-t border-x'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }
                                `}
                            >
                                {editingTabId === tab.id ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            ref={inputRef}
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename()
                                                if (e.key === 'Escape') {
                                                    setEditingTabId(null)
                                                    setEditingName('')
                                                }
                                            }}
                                            className="h-6 w-24 text-xs"
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-5 w-5"
                                            onClick={handleRename}
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span onDoubleClick={() => handleStartRename(tab.id, tab.name)}>
                                        {tab.name}
                                    </span>
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleStartRename(tab.id, tab.name)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Переименовать
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => handleDelete(tab.id)}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}

                {/* Add Tab Button */}
                {isAdding ? (
                    <div className="flex items-center gap-1 px-2">
                        <Input
                            value={newTabName}
                            onChange={(e) => setNewTabName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTab()
                                if (e.key === 'Escape') {
                                    setIsAdding(false)
                                    setNewTabName('')
                                }
                            }}
                            placeholder="Имя вкладки"
                            className="h-6 w-24 text-xs"
                            autoFocus
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={handleAddTab}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => {
                                setIsAdding(false)
                                setNewTabName('')
                            }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
