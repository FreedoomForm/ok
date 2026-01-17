'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    setPresence,
    removePresence,
    subscribeToPresence,
    updateCursor,
    removeCursor,
    subscribeToCursors,
    subscribeToCells,
    updateCell as rtdbUpdateCell,
    subscribeToSelections,
    updateSelection,
    getUserColor,
    UserPresence,
    CursorPosition,
    CellData,
    UserSelection
} from '@/lib/realtime-db'

// ============================================
// Presence Hook
// ============================================

export function usePresence(workspaceId: string | null, userId: string | null, userName: string) {
    const [users, setUsers] = useState<Record<string, UserPresence>>({})
    const [myColor] = useState(() => userId ? getUserColor(userId) : '#888')

    useEffect(() => {
        if (!workspaceId || !userId) return

        // Set presence when component mounts
        setPresence(workspaceId, userId, { name: userName, color: myColor })

        // Subscribe to presence changes
        const unsubscribe = subscribeToPresence(workspaceId, setUsers)

        // Remove presence on unmount
        return () => {
            removePresence(workspaceId, userId)
            unsubscribe()
        }
    }, [workspaceId, userId, userName, myColor])

    const onlineUsers = Object.entries(users)
        .filter(([_, user]) => user.online)
        .map(([id, user]) => ({ id, ...user }))

    return { users: onlineUsers, myColor }
}

// ============================================
// Cursors Hook
// ============================================

export function useCursors(
    workspaceId: string | null,
    userId: string | null,
    userName: string
) {
    const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
    const [myColor] = useState(() => userId ? getUserColor(userId) : '#888')

    useEffect(() => {
        if (!workspaceId) return

        const unsubscribe = subscribeToCursors(workspaceId, setCursors)
        return unsubscribe
    }, [workspaceId])

    const setCursor = useCallback((sheetId: string, rowId: string, colId: string) => {
        if (!workspaceId || !userId) return

        updateCursor(workspaceId, userId, {
            sheetId,
            rowId,
            colId,
            color: myColor,
            name: userName
        })
    }, [workspaceId, userId, myColor, userName])

    const clearCursor = useCallback(() => {
        if (!workspaceId || !userId) return
        removeCursor(workspaceId, userId)
    }, [workspaceId, userId])

    // Filter out my own cursor
    const otherCursors = Object.entries(cursors)
        .filter(([id]) => id !== userId)
        .reduce((acc, [id, cursor]) => ({ ...acc, [id]: cursor }), {})

    return { cursors: otherCursors, setCursor, clearCursor }
}

// ============================================
// Real-time Cells Hook
// ============================================

export function useRealtimeCells(
    workspaceId: string | null,
    sheetId: string | null,
    userId: string | null
) {
    const [cells, setCells] = useState<Record<string, CellData>>({})
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!workspaceId || !sheetId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const unsubscribe = subscribeToCells(workspaceId, sheetId, (data) => {
            setCells(data)
            setIsLoading(false)
        })

        return unsubscribe
    }, [workspaceId, sheetId])

    const updateCellValue = useCallback((
        cellId: string,
        value: any,
        type: string = 'text'
    ) => {
        if (!workspaceId || !sheetId || !userId) return

        rtdbUpdateCell(workspaceId, sheetId, cellId, value, type, userId)
    }, [workspaceId, sheetId, userId])

    return { cells, isLoading, updateCell: updateCellValue }
}

// ============================================
// Selection Hook
// ============================================

export function useSelections(
    workspaceId: string | null,
    sheetId: string | null,
    userId: string | null,
    userName: string
) {
    const [selections, setSelections] = useState<Record<string, UserSelection>>({})
    const [myColor] = useState(() => userId ? getUserColor(userId) : '#888')

    useEffect(() => {
        if (!workspaceId || !sheetId) return

        const unsubscribe = subscribeToSelections(workspaceId, sheetId, setSelections)
        return unsubscribe
    }, [workspaceId, sheetId])

    const setMySelection = useCallback((cellIds: string[]) => {
        if (!workspaceId || !sheetId || !userId) return

        updateSelection(workspaceId, sheetId, userId, cellIds, myColor, userName)
    }, [workspaceId, sheetId, userId, myColor, userName])

    // Filter out my own selection
    const otherSelections = Object.entries(selections)
        .filter(([id]) => id !== userId)
        .reduce((acc, [id, sel]) => ({ ...acc, [id]: sel }), {})

    return { selections: otherSelections, setMySelection }
}

// ============================================
// Combined Collaboration Hook
// ============================================

export function useCollaboration(
    workspaceId: string | null,
    sheetId: string | null,
    userId: string | null,
    userName: string
) {
    const presence = usePresence(workspaceId, userId, userName)
    const cursors = useCursors(workspaceId, userId, userName)
    const cells = useRealtimeCells(workspaceId, sheetId, userId)
    const selections = useSelections(workspaceId, sheetId, userId, userName)

    return {
        // Presence
        onlineUsers: presence.users,
        myColor: presence.myColor,

        // Cursors
        otherCursors: cursors.cursors,
        setCursor: cursors.setCursor,
        clearCursor: cursors.clearCursor,

        // Cells
        cells: cells.cells,
        cellsLoading: cells.isLoading,
        updateCell: cells.updateCell,

        // Selections
        otherSelections: selections.selections,
        setMySelection: selections.setMySelection
    }
}
