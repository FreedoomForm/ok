import {
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    onChildAdded,
    onChildChanged,
    onChildRemoved,
    off,
    serverTimestamp,
    DataSnapshot,
    DatabaseReference
} from 'firebase/database'
import { rtdb } from './firebase'

// ============================================
// Realtime Database Paths
// ============================================

// Structure:
// workspaces/{workspaceId}/
//   presence/{userId}              - Online users
//   cursors/{userId}               - User cursor positions
//   sheets/{sheetId}/
//     cells/{cellId}              - Cell values (for real-time editing)
//     selections/{userId}          - Cell selections by user

export const RTDB_PATHS = {
    workspace: (workspaceId: string) => `workspaces/${workspaceId}`,
    presence: (workspaceId: string) => `workspaces/${workspaceId}/presence`,
    userPresence: (workspaceId: string, userId: string) =>
        `workspaces/${workspaceId}/presence/${userId}`,
    cursors: (workspaceId: string) => `workspaces/${workspaceId}/cursors`,
    userCursor: (workspaceId: string, userId: string) =>
        `workspaces/${workspaceId}/cursors/${userId}`,
    sheet: (workspaceId: string, sheetId: string) =>
        `workspaces/${workspaceId}/sheets/${sheetId}`,
    cells: (workspaceId: string, sheetId: string) =>
        `workspaces/${workspaceId}/sheets/${sheetId}/cells`,
    cell: (workspaceId: string, sheetId: string, cellId: string) =>
        `workspaces/${workspaceId}/sheets/${sheetId}/cells/${cellId}`,
    selections: (workspaceId: string, sheetId: string) =>
        `workspaces/${workspaceId}/sheets/${sheetId}/selections`
}

// ============================================
// Presence System (Real-time user tracking)
// ============================================

export interface UserPresence {
    name: string
    color: string
    online: boolean
    lastSeen: number
}

export async function setPresence(
    workspaceId: string,
    userId: string,
    userData: { name: string; color: string }
): Promise<void> {
    if (!rtdb) return

    const presenceRef = ref(rtdb, RTDB_PATHS.userPresence(workspaceId, userId))
    await set(presenceRef, {
        ...userData,
        online: true,
        lastSeen: serverTimestamp()
    })
}

export async function removePresence(workspaceId: string, userId: string): Promise<void> {
    if (!rtdb) return

    const presenceRef = ref(rtdb, RTDB_PATHS.userPresence(workspaceId, userId))
    await update(presenceRef, {
        online: false,
        lastSeen: serverTimestamp()
    })
}

export function subscribeToPresence(
    workspaceId: string,
    callback: (users: Record<string, UserPresence>) => void
): () => void {
    if (!rtdb) return () => { }

    const presenceRef = ref(rtdb, RTDB_PATHS.presence(workspaceId))

    const unsubscribe = onValue(presenceRef, (snapshot) => {
        const data = snapshot.val() || {}
        callback(data)
    })

    return () => off(presenceRef)
}

// ============================================
// Cursor Tracking (Real-time collaboration)
// ============================================

export interface CursorPosition {
    sheetId: string
    rowId: string
    colId: string
    color: string
    name: string
}

export async function updateCursor(
    workspaceId: string,
    userId: string,
    cursor: CursorPosition
): Promise<void> {
    if (!rtdb) return

    const cursorRef = ref(rtdb, RTDB_PATHS.userCursor(workspaceId, userId))
    await set(cursorRef, {
        ...cursor,
        timestamp: serverTimestamp()
    })
}

export async function removeCursor(workspaceId: string, userId: string): Promise<void> {
    if (!rtdb) return

    const cursorRef = ref(rtdb, RTDB_PATHS.userCursor(workspaceId, userId))
    await remove(cursorRef)
}

export function subscribeToCursors(
    workspaceId: string,
    callback: (cursors: Record<string, CursorPosition>) => void
): () => void {
    if (!rtdb) return () => { }

    const cursorsRef = ref(rtdb, RTDB_PATHS.cursors(workspaceId))

    onValue(cursorsRef, (snapshot) => {
        const data = snapshot.val() || {}
        callback(data)
    })

    return () => off(cursorsRef)
}

// ============================================
// Cell Editing (Real-time sync)
// ============================================

export interface CellData {
    value: any
    type: string
    updatedBy: string
    updatedAt: number
}

export async function updateCell(
    workspaceId: string,
    sheetId: string,
    cellId: string,
    value: any,
    type: string,
    userId: string
): Promise<void> {
    if (!rtdb) return

    const cellRef = ref(rtdb, RTDB_PATHS.cell(workspaceId, sheetId, cellId))
    await set(cellRef, {
        value,
        type,
        updatedBy: userId,
        updatedAt: serverTimestamp()
    })
}

export async function deleteCell(
    workspaceId: string,
    sheetId: string,
    cellId: string
): Promise<void> {
    if (!rtdb) return

    const cellRef = ref(rtdb, RTDB_PATHS.cell(workspaceId, sheetId, cellId))
    await remove(cellRef)
}

export function subscribeToCells(
    workspaceId: string,
    sheetId: string,
    callback: (cells: Record<string, CellData>) => void
): () => void {
    if (!rtdb) return () => { }

    const cellsRef = ref(rtdb, RTDB_PATHS.cells(workspaceId, sheetId))

    onValue(cellsRef, (snapshot) => {
        const data = snapshot.val() || {}
        callback(data)
    })

    return () => off(cellsRef)
}

// Subscribe to individual cell changes
export function subscribeToCellChanges(
    workspaceId: string,
    sheetId: string,
    onAdd: (cellId: string, data: CellData) => void,
    onChange: (cellId: string, data: CellData) => void,
    onRemove: (cellId: string) => void
): () => void {
    if (!rtdb) return () => { }

    const cellsRef = ref(rtdb, RTDB_PATHS.cells(workspaceId, sheetId))

    onChildAdded(cellsRef, (snapshot) => {
        onAdd(snapshot.key!, snapshot.val())
    })

    onChildChanged(cellsRef, (snapshot) => {
        onChange(snapshot.key!, snapshot.val())
    })

    onChildRemoved(cellsRef, (snapshot) => {
        onRemove(snapshot.key!)
    })

    return () => off(cellsRef)
}

// ============================================
// Selection Tracking
// ============================================

export interface UserSelection {
    cellIds: string[]
    color: string
    name: string
}

export async function updateSelection(
    workspaceId: string,
    sheetId: string,
    userId: string,
    cellIds: string[],
    color: string,
    name: string
): Promise<void> {
    if (!rtdb) return

    const selectionRef = ref(rtdb, `${RTDB_PATHS.selections(workspaceId, sheetId)}/${userId}`)
    await set(selectionRef, {
        cellIds,
        color,
        name,
        timestamp: serverTimestamp()
    })
}

export function subscribeToSelections(
    workspaceId: string,
    sheetId: string,
    callback: (selections: Record<string, UserSelection>) => void
): () => void {
    if (!rtdb) return () => { }

    const selectionsRef = ref(rtdb, RTDB_PATHS.selections(workspaceId, sheetId))

    onValue(selectionsRef, (snapshot) => {
        const data = snapshot.val() || {}
        callback(data)
    })

    return () => off(selectionsRef)
}

// ============================================
// Batch Operations
// ============================================

export async function batchUpdateCells(
    workspaceId: string,
    sheetId: string,
    updates: Record<string, { value: any; type: string }>,
    userId: string
): Promise<void> {
    if (!rtdb) return

    const cellsRef = ref(rtdb, RTDB_PATHS.cells(workspaceId, sheetId))

    const batchUpdates: Record<string, CellData> = {}
    const timestamp = Date.now()

    for (const [cellId, data] of Object.entries(updates)) {
        batchUpdates[cellId] = {
            value: data.value,
            type: data.type,
            updatedBy: userId,
            updatedAt: timestamp
        }
    }

    await update(cellsRef, batchUpdates)
}

// ============================================
// Utility: Generate user color
// ============================================

const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
]

export function getUserColor(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}
