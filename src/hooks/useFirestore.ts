'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    getAdminCollections,
    queryDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    subscribeToCollection,
    subscribeToDocument,
    Tab,
    Sheet,
    Column,
    Row,
    orderBy
} from '@/lib/firestore'
import { CollectionReference } from 'firebase/firestore'

// ============================================
// Generic Collection Hook
// ============================================

export function useCollection<T>(
    collectionRef: CollectionReference | null,
    realtime = true
) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!collectionRef) {
            setLoading(false)
            return
        }

        if (realtime) {
            const unsubscribe = subscribeToCollection<T>(
                collectionRef,
                (newData) => {
                    setData(newData)
                    setLoading(false)
                }
            )
            return () => unsubscribe()
        } else {
            queryDocuments<T>(collectionRef)
                .then(setData)
                .catch(setError)
                .finally(() => setLoading(false))
        }
    }, [collectionRef, realtime])

    return { data, loading, error }
}

// ============================================
// Admin Workspace Hook
// ============================================

export function useAdminWorkspace(adminId: string | null) {
    const [collections, setCollections] = useState<ReturnType<typeof getAdminCollections> | null>(null)

    useEffect(() => {
        if (adminId) {
            setCollections(getAdminCollections(adminId))
        }
    }, [adminId])

    return collections
}

// ============================================
// Tabs Hook (Excel-like)
// ============================================

export function useTabs(adminId: string | null) {
    const workspace = useAdminWorkspace(adminId)
    const { data: tabs, loading, error } = useCollection<Tab>(
        workspace?.tabs ?? null,
        true
    )

    const sortedTabs = tabs.sort((a, b) => a.order - b.order)

    const addTab = useCallback(async (name: string) => {
        if (!workspace) return null
        const order = tabs.length
        return await createDocument(workspace.tabs, {
            name,
            order,
            sheetId: '' // Will be set after sheet creation
        })
    }, [workspace, tabs])

    const renameTab = useCallback(async (tabId: string, name: string) => {
        if (!workspace) return
        await updateDocument(workspace.tabs, tabId, { name })
    }, [workspace])

    const removeTab = useCallback(async (tabId: string) => {
        if (!workspace) return
        await deleteDocument(workspace.tabs, tabId)
    }, [workspace])

    const reorderTabs = useCallback(async (tabIds: string[]) => {
        if (!workspace) return
        await Promise.all(
            tabIds.map((id, index) =>
                updateDocument(workspace.tabs, id, { order: index })
            )
        )
    }, [workspace])

    return {
        tabs: sortedTabs,
        loading,
        error,
        addTab,
        renameTab,
        removeTab,
        reorderTabs
    }
}

// ============================================
// Sheet Hook (Excel Grid)
// ============================================

export function useSheet(adminId: string | null, sheetId: string | null) {
    const workspace = useAdminWorkspace(adminId)
    const [sheet, setSheet] = useState<Sheet | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!workspace || !sheetId) {
            setLoading(false)
            return
        }

        const unsubscribe = subscribeToDocument<Sheet>(
            workspace.sheets,
            sheetId,
            (data) => {
                setSheet(data)
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [workspace, sheetId])

    // Column operations
    const addColumn = useCallback(async (column: Omit<Column, 'id' | 'order'>) => {
        if (!workspace || !sheetId || !sheet) return

        const newColumn: Column = {
            ...column,
            id: `col_${Date.now()}`,
            order: sheet.columns.length
        }

        await updateDocument(workspace.sheets, sheetId, {
            columns: [...sheet.columns, newColumn]
        })
    }, [workspace, sheetId, sheet])

    const updateColumn = useCallback(async (columnId: string, updates: Partial<Column>) => {
        if (!workspace || !sheetId || !sheet) return

        const updatedColumns = sheet.columns.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
        )

        await updateDocument(workspace.sheets, sheetId, { columns: updatedColumns })
    }, [workspace, sheetId, sheet])

    const deleteColumn = useCallback(async (columnId: string) => {
        if (!workspace || !sheetId || !sheet) return

        const updatedColumns = sheet.columns.filter(col => col.id !== columnId)
        const updatedRows = sheet.rows.map(row => {
            const { [columnId]: _, ...rest } = row.cells
            return { ...row, cells: rest }
        })

        await updateDocument(workspace.sheets, sheetId, {
            columns: updatedColumns,
            rows: updatedRows
        })
    }, [workspace, sheetId, sheet])

    // Row operations
    const addRow = useCallback(async (cells: Record<string, any> = {}) => {
        if (!workspace || !sheetId || !sheet) return

        const newRow: Row = {
            id: `row_${Date.now()}`,
            cells,
            order: sheet.rows.length
        }

        await updateDocument(workspace.sheets, sheetId, {
            rows: [...sheet.rows, newRow]
        })
    }, [workspace, sheetId, sheet])

    const updateCell = useCallback(async (rowId: string, columnId: string, value: any) => {
        if (!workspace || !sheetId || !sheet) return

        const updatedRows = sheet.rows.map(row =>
            row.id === rowId
                ? { ...row, cells: { ...row.cells, [columnId]: value } }
                : row
        )

        await updateDocument(workspace.sheets, sheetId, { rows: updatedRows })
    }, [workspace, sheetId, sheet])

    const deleteRow = useCallback(async (rowId: string) => {
        if (!workspace || !sheetId || !sheet) return

        const updatedRows = sheet.rows.filter(row => row.id !== rowId)
        await updateDocument(workspace.sheets, sheetId, { rows: updatedRows })
    }, [workspace, sheetId, sheet])

    return {
        sheet,
        loading,
        addColumn,
        updateColumn,
        deleteColumn,
        addRow,
        updateCell,
        deleteRow
    }
}

// ============================================
// Customers Hook (uses Firestore)
// ============================================

export function useCustomers(adminId: string | null) {
    const workspace = useAdminWorkspace(adminId)
    const { data: customers, loading, error } = useCollection<any>(
        workspace?.customers ?? null,
        true
    )

    const addCustomer = useCallback(async (data: any) => {
        if (!workspace) return null
        return await createDocument(workspace.customers, data)
    }, [workspace])

    const updateCustomer = useCallback(async (customerId: string, data: any) => {
        if (!workspace) return
        await updateDocument(workspace.customers, customerId, data)
    }, [workspace])

    const deleteCustomer = useCallback(async (customerId: string) => {
        if (!workspace) return
        await deleteDocument(workspace.customers, customerId)
    }, [workspace])

    return { customers, loading, error, addCustomer, updateCustomer, deleteCustomer }
}

// ============================================
// Orders Hook (uses Firestore)
// ============================================

export function useOrders(adminId: string | null) {
    const workspace = useAdminWorkspace(adminId)
    const { data: orders, loading, error } = useCollection<any>(
        workspace?.orders ?? null,
        true
    )

    const addOrder = useCallback(async (data: any) => {
        if (!workspace) return null
        return await createDocument(workspace.orders, data)
    }, [workspace])

    const updateOrder = useCallback(async (orderId: string, data: any) => {
        if (!workspace) return
        await updateDocument(workspace.orders, orderId, data)
    }, [workspace])

    const deleteOrder = useCallback(async (orderId: string) => {
        if (!workspace) return
        await deleteDocument(workspace.orders, orderId)
    }, [workspace])

    return { orders, loading, error, addOrder, updateOrder, deleteOrder }
}
