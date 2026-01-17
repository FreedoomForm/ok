'use client'

import { Button } from '@/components/ui/button'
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Palette,
    Save,
    Undo,
    Redo,
    Filter,
    SortAsc,
    SortDesc,
    Download,
    Upload,
    Settings,
    Sparkles
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface ToolbarProps {
    onSave?: () => void
    onUndo?: () => void
    onRedo?: () => void
    onAIAssist?: () => void
    isSaving?: boolean
}

export function Toolbar({ onSave, onUndo, onRedo, onAIAssist, isSaving }: ToolbarProps) {
    const ToolButton = ({
        icon: Icon,
        label,
        onClick,
        disabled
    }: {
        icon: React.ElementType
        label: string
        onClick?: () => void
        disabled?: boolean
    }) => (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClick}
                        disabled={disabled}
                    >
                        <Icon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )

    return (
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-background">
            {/* File Operations */}
            <div className="flex items-center border-r pr-2 mr-2">
                <ToolButton
                    icon={Save}
                    label="Сохранить (Ctrl+S)"
                    onClick={onSave}
                    disabled={isSaving}
                />
                <ToolButton icon={Undo} label="Отменить (Ctrl+Z)" onClick={onUndo} />
                <ToolButton icon={Redo} label="Повторить (Ctrl+Y)" onClick={onRedo} />
            </div>

            {/* Text Formatting */}
            <div className="flex items-center border-r pr-2 mr-2">
                <ToolButton icon={Bold} label="Жирный" />
                <ToolButton icon={Italic} label="Курсив" />
                <ToolButton icon={Underline} label="Подчеркнутый" />
            </div>

            {/* Alignment */}
            <div className="flex items-center border-r pr-2 mr-2">
                <ToolButton icon={AlignLeft} label="По левому краю" />
                <ToolButton icon={AlignCenter} label="По центру" />
                <ToolButton icon={AlignRight} label="По правому краю" />
            </div>

            {/* Data Operations */}
            <div className="flex items-center border-r pr-2 mr-2">
                <ToolButton icon={Filter} label="Фильтр" />
                <ToolButton icon={SortAsc} label="Сортировка А-Я" />
                <ToolButton icon={SortDesc} label="Сортировка Я-А" />
            </div>

            {/* Import/Export */}
            <div className="flex items-center border-r pr-2 mr-2">
                <ToolButton icon={Upload} label="Импорт" />
                <ToolButton icon={Download} label="Экспорт" />
            </div>

            {/* AI Assistant */}
            <div className="flex items-center ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={onAIAssist}
                >
                    <Sparkles className="h-4 w-4" />
                    AI Помощник
                </Button>
            </div>
        </div>
    )
}
