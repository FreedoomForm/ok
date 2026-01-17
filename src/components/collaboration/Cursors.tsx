'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Cursor {
    rowId: string
    colId: string
    color: string
    name: string
}

interface CursorsOverlayProps {
    cursors: Record<string, Cursor>
    getCellPosition: (rowId: string, colId: string) => { x: number; y: number } | null
}

export function CursorsOverlay({ cursors, getCellPosition }: CursorsOverlayProps) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
            <AnimatePresence>
                {Object.entries(cursors).map(([userId, cursor]) => {
                    const position = getCellPosition(cursor.rowId, cursor.colId)
                    if (!position) return null

                    return (
                        <motion.div
                            key={userId}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute"
                            style={{
                                left: position.x,
                                top: position.y - 20,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            {/* Cursor pointer */}
                            <svg
                                width="16"
                                height="20"
                                viewBox="0 0 16 20"
                                fill="none"
                                className="drop-shadow-md"
                            >
                                <path
                                    d="M0 0L16 12L8 14L4 20L0 0Z"
                                    fill={cursor.color}
                                />
                            </svg>

                            {/* Name tag */}
                            <div
                                className="absolute left-4 top-3 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap shadow-md"
                                style={{ backgroundColor: cursor.color }}
                            >
                                {cursor.name}
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}

// Selection highlight component
interface SelectionOverlayProps {
    selections: Record<string, { cellIds: string[]; color: string; name: string }>
    getCellPosition: (cellId: string) => { x: number; y: number; width: number; height: number } | null
}

export function SelectionOverlay({ selections, getCellPosition }: SelectionOverlayProps) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
            {Object.entries(selections).map(([userId, selection]) => (
                <div key={userId}>
                    {selection.cellIds.map((cellId) => {
                        const pos = getCellPosition(cellId)
                        if (!pos) return null

                        return (
                            <motion.div
                                key={cellId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.3 }}
                                className="absolute"
                                style={{
                                    left: pos.x,
                                    top: pos.y,
                                    width: pos.width,
                                    height: pos.height,
                                    backgroundColor: selection.color,
                                    border: `2px solid ${selection.color}`
                                }}
                            />
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
