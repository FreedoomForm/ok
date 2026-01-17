'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSheet } from '@/hooks/useFirestore'
import type { Column, Row } from '@/lib/firestore'
import { executeFormula, isFormula, AVAILABLE_FUNCTIONS } from '@/lib/excel/formulas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Trash2, GripVertical, FunctionSquare } from 'lucide-react'

interface SheetProps {
    adminId: string
    sheetId: string
}

// Cell Component with formula support
function Cell({
    value,
    column,
    rowId,
    colId,
    onUpdate,
    isSelected,
    onSelect,
    getCellValue
}: {
    value: any
    column: Column
    rowId: string
    colId: string
    onUpdate: (value: any) => void
    isSelected: boolean
    onSelect: () => void
    getCellValue: (cellId: string) => any
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(String(value ?? ''))
    const [showFormulaHelp, setShowFormulaHelp] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleDoubleClick = () => {
        setIsEditing(true)
        setEditValue(String(value ?? ''))
    }

    const handleSave = () => {
        let finalValue: any = editValue

        // If it's a formula, store as-is (will be computed on display)
        if (!isFormula(editValue)) {
            // Type conversion based on column type
            if (column.type === 'number') {
                finalValue = parseFloat(editValue) || 0
            } else if (column.type === 'boolean') {
                finalValue = editValue.toLowerCase() === 'true' || editValue === '1'
            }
        }

        onUpdate(finalValue)
        setIsEditing(false)
        setShowFormulaHelp(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setIsEditing(false)
            setEditValue(String(value ?? ''))
            setShowFormulaHelp(false)
        } else if (e.key === '=' && editValue === '') {
            setShowFormulaHelp(true)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value
        setEditValue(newVal)

        // Show formula help when typing = at start
        if (newVal.startsWith('=')) {
            setShowFormulaHelp(true)
        } else {
            setShowFormulaHelp(false)
        }
    }

    // Compute display value
    const displayValue = () => {
        if (value === null || value === undefined) return ''

        // If it's a formula, execute it
        if (isFormula(String(value))) {
            const result = executeFormula(String(value), getCellValue)
            if (result.error) {
                return result.value // Shows #ERROR!
            }
            return String(result.value)
        }

        if (column.type === 'boolean') return value ? '✓' : ''
        if (column.type === 'date' && value) {
            return new Date(value).toLocaleDateString('ru-RU')
        }
        return String(value)
    }

    const isFormulaCell = isFormula(String(value ?? ''))

    return (
        <div
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            className={`
                relative h-8 px-2 border-r border-b flex items-center cursor-cell
                ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : 'hover:bg-muted/50'}
                ${isFormulaCell ? 'bg-purple-50' : ''}
            `}
            style={{ width: column.width, minWidth: column.width }}
        >
            {isEditing ? (
                <div className="relative w-full">
                    <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={`h-6 px-1 text-sm border-0 focus-visible:ring-0 ${editValue.startsWith('=') ? 'font-mono text-purple-600' : ''
                            }`}
                    />

                    {/* Formula Help Popover */}
                    {showFormulaHelp && (
                        <div className="absolute top-8 left-0 z-50 bg-white border rounded-lg shadow-lg p-2 w-64 max-h-48 overflow-auto">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                Доступные функции:
                            </p>
                            {AVAILABLE_FUNCTIONS.map((fn) => (
                                <div
                                    key={fn.name}
                                    className="text-xs p-1 hover:bg-muted rounded cursor-pointer"
                                    onClick={() => {
                                        setEditValue(`=${fn.name}(`)
                                        inputRef.current?.focus()
                                    }}
                                >
                                    <span className="font-mono text-purple-600">{fn.syntax}</span>
                                    <span className="text-muted-foreground ml-2">- {fn.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {isFormulaCell && (
                        <FunctionSquare className="w-3 h-3 text-purple-500 mr-1 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{displayValue()}</span>
                </>
            )}
        </div>
    )
}

// Column Header Component
function ColumnHeader({
    column,
    onUpdate,
    onDelete,
    onResize
}: {
    column: Column
    onUpdate: (updates: Partial<Column>) => void
    onDelete: () => void
    onResize: (width: number) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(column.name)

    const handleSaveName = () => {
        onUpdate({ name: editName })
        setIsEditing(false)
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className="h-8 px-2 border-r border-b bg-muted/50 flex items-center justify-between cursor-pointer select-none font-medium text-sm group"
                    style={{ width: column.width, minWidth: column.width }}
                >
                    {isEditing ? (
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName()
                                if (e.key === 'Escape') {
                                    setIsEditing(false)
                                    setEditName(column.name)
                                }
                            }}
                            className="h-6 px-1 text-sm"
                            autoFocus
                        />
                    ) : (
                        <span onDoubleClick={() => setIsEditing(true)}>
                            {column.name}
                        </span>
                    )}
                    <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => setIsEditing(true)}>
                    Переименовать
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onUpdate({ type: 'text' })}>
                    Тип: Текст
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onUpdate({ type: 'number' })}>
                    Тип: Число
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onUpdate({ type: 'date' })}>
                    Тип: Дата
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onUpdate({ type: 'formula' })}>
                    Тип: Формула
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить столбец
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

// Main Sheet Component with formula support
export function Sheet({ adminId, sheetId }: SheetProps) {
    const {
        sheet,
        loading,
        addColumn,
        updateColumn,
        deleteColumn,
        addRow,
        updateCell,
        deleteRow
    } = useSheet(adminId, sheetId)

    const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null)

    // Create a cell value getter for formula execution
    const getCellValue = useCallback((cellId: string): any => {
        if (!sheet) return null

        // Parse cell ID like "A1" to get column index and row
        const match = cellId.match(/^([A-Z]+)(\d+)$/i)
        if (!match) return null

        const colLetter = match[1].toUpperCase()
        const rowNum = parseInt(match[2], 10) - 1 // 0-indexed

        // Convert column letter to index
        let colIndex = 0
        for (let i = 0; i < colLetter.length; i++) {
            colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64)
        }
        colIndex-- // 0-indexed

        const columns = [...sheet.columns].sort((a, b) => a.order - b.order)
        const rows = [...sheet.rows].sort((a, b) => a.order - b.order)

        if (colIndex >= columns.length || rowNum >= rows.length) return null

        const col = columns[colIndex]
        const row = rows[rowNum]

        const value = row.cells[col.id]

        // If the referenced cell is also a formula, execute it
        if (isFormula(String(value ?? ''))) {
            const result = executeFormula(String(value), getCellValue)
            return result.value
        }

        return value
    }, [sheet])

    const handleAddColumn = async () => {
        await addColumn({
            name: `Column ${(sheet?.columns.length ?? 0) + 1}`,
            type: 'text',
            width: 150
        })
    }

    const handleAddRow = async () => {
        await addRow({})
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (!sheet) {
        return (
            <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground">
                Выберите вкладку для просмотра данных
            </div>
        )
    }

    const columns = [...sheet.columns].sort((a, b) => a.order - b.order)
    const rows = [...sheet.rows].sort((a, b) => a.order - b.order)

    return (
        <div className="flex-1 overflow-auto bg-background">
            {/* Formula bar */}
            {selectedCell && (
                <div className="sticky top-0 z-20 flex items-center gap-2 px-2 py-1 bg-muted/80 border-b text-sm">
                    <FunctionSquare className="w-4 h-4 text-purple-500" />
                    <span className="font-mono text-muted-foreground">
                        {/* Show cell reference */}
                        {(() => {
                            const colIndex = columns.findIndex(c => c.id === selectedCell.colId)
                            const rowIndex = rows.findIndex(r => r.id === selectedCell.rowId)
                            if (colIndex === -1 || rowIndex === -1) return ''
                            const colLetter = String.fromCharCode(65 + colIndex)
                            return `${colLetter}${rowIndex + 1}`
                        })()}:
                    </span>
                    <span className="truncate">
                        {rows.find(r => r.id === selectedCell.rowId)?.cells[selectedCell.colId] ?? ''}
                    </span>
                </div>
            )}

            <div className="inline-block min-w-full">
                {/* Header Row */}
                <div className="flex sticky top-8 z-10 bg-background">
                    {/* Row Number Column */}
                    <div className="h-8 w-12 border-r border-b bg-muted/50 flex items-center justify-center text-xs text-muted-foreground sticky left-0">
                        #
                    </div>

                    {columns.map((column) => (
                        <ColumnHeader
                            key={column.id}
                            column={column}
                            onUpdate={(updates) => updateColumn(column.id, updates)}
                            onDelete={() => deleteColumn(column.id)}
                            onResize={(width) => updateColumn(column.id, { width })}
                        />
                    ))}

                    {/* Add Column Button */}
                    <div className="h-8 w-10 border-b flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleAddColumn}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Data Rows */}
                {rows.map((row, rowIndex) => (
                    <ContextMenu key={row.id}>
                        <ContextMenuTrigger>
                            <div className="flex group">
                                {/* Row Number */}
                                <div className="h-8 w-12 border-r border-b bg-muted/30 flex items-center justify-center text-xs text-muted-foreground sticky left-0">
                                    {rowIndex + 1}
                                </div>

                                {columns.map((column) => (
                                    <Cell
                                        key={column.id}
                                        value={row.cells[column.id]}
                                        column={column}
                                        rowId={row.id}
                                        colId={column.id}
                                        onUpdate={(value) => updateCell(row.id, column.id, value)}
                                        isSelected={selectedCell?.rowId === row.id && selectedCell?.colId === column.id}
                                        onSelect={() => setSelectedCell({ rowId: row.id, colId: column.id })}
                                        getCellValue={getCellValue}
                                    />
                                ))}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => addRow({})}>
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить строку ниже
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={() => deleteRow(row.id)}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить строку
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}

                {/* Add Row Button */}
                <div className="flex">
                    <div className="h-8 w-12 border-r border-b bg-muted/10 flex items-center justify-center sticky left-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleAddRow}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="h-8 border-b flex-1" />
                </div>
            </div>
        </div>
    )
}
