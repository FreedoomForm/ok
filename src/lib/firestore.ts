import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    DocumentData,
    QueryConstraint,
    CollectionReference
} from 'firebase/firestore'
import { db } from './firebase'

// ============================================
// Collection References
// ============================================

// Admin workspace structure:
// admins/{adminId}/customers/{customerId}
// admins/{adminId}/orders/{orderId}
// admins/{adminId}/couriers/{courierId}
// admins/{adminId}/tabs/{tabId}
// admins/{adminId}/sheets/{sheetId}

export const COLLECTIONS = {
    ADMINS: 'admins',
    WEBSITES: 'websites',
    WORKSPACES: 'workspaces'
} as const

// Get sub-collection references for an admin
export const getAdminCollections = (adminId: string) => ({
    customers: collection(db, COLLECTIONS.ADMINS, adminId, 'customers'),
    orders: collection(db, COLLECTIONS.ADMINS, adminId, 'orders'),
    couriers: collection(db, COLLECTIONS.ADMINS, adminId, 'couriers'),
    lowAdmins: collection(db, COLLECTIONS.ADMINS, adminId, 'lowAdmins'),
    tabs: collection(db, COLLECTIONS.ADMINS, adminId, 'tabs'),
    sheets: collection(db, COLLECTIONS.ADMINS, adminId, 'sheets')
})

// ============================================
// Generic CRUD Operations
// ============================================

export async function createDocument<T extends DocumentData>(
    collectionRef: CollectionReference,
    data: T,
    customId?: string
): Promise<string> {
    const docRef = customId
        ? doc(collectionRef, customId)
        : doc(collectionRef)

    await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })

    return docRef.id
}

export async function getDocument<T>(
    collectionRef: CollectionReference,
    docId: string
): Promise<T | null> {
    const docRef = doc(collectionRef, docId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) return null

    return { id: snapshot.id, ...snapshot.data() } as T
}

export async function updateDocument<T extends Partial<DocumentData>>(
    collectionRef: CollectionReference,
    docId: string,
    data: T
): Promise<void> {
    const docRef = doc(collectionRef, docId)
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export async function deleteDocument(
    collectionRef: CollectionReference,
    docId: string
): Promise<void> {
    const docRef = doc(collectionRef, docId)
    await deleteDoc(docRef)
}

export async function queryDocuments<T>(
    collectionRef: CollectionReference,
    ...constraints: QueryConstraint[]
): Promise<T[]> {
    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as T[]
}

// ============================================
// Real-time Listeners
// ============================================

export function subscribeToCollection<T>(
    collectionRef: CollectionReference,
    callback: (data: T[]) => void,
    ...constraints: QueryConstraint[]
) {
    const q = query(collectionRef, ...constraints)

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as T[]
        callback(data)
    })
}

export function subscribeToDocument<T>(
    collectionRef: CollectionReference,
    docId: string,
    callback: (data: T | null) => void
) {
    const docRef = doc(collectionRef, docId)

    return onSnapshot(docRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null)
            return
        }
        callback({ id: snapshot.id, ...snapshot.data() } as T)
    })
}

// ============================================
// Presence System (for collaboration)
// ============================================

export async function setUserPresence(
    workspaceId: string,
    userId: string,
    userData: { name: string; color: string }
) {
    const presenceRef = doc(db, COLLECTIONS.WORKSPACES, workspaceId, 'presence', userId)
    await setDoc(presenceRef, {
        ...userData,
        lastSeen: serverTimestamp(),
        online: true
    })
}

export async function removeUserPresence(workspaceId: string, userId: string) {
    const presenceRef = doc(db, COLLECTIONS.WORKSPACES, workspaceId, 'presence', userId)
    await updateDoc(presenceRef, {
        online: false,
        lastSeen: serverTimestamp()
    })
}

export function subscribeToPresence(
    workspaceId: string,
    callback: (users: Array<{ id: string; name: string; color: string; online: boolean }>) => void
) {
    const presenceRef = collection(db, COLLECTIONS.WORKSPACES, workspaceId, 'presence')

    return onSnapshot(presenceRef, (snapshot) => {
        const users = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => u.online) as Array<{ id: string; name: string; color: string; online: boolean }>
        callback(users)
    })
}

// ============================================
// Excel-like Tab & Sheet Operations
// ============================================

export interface Tab {
    id: string
    name: string
    order: number
    sheetId: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface Sheet {
    id: string
    columns: Column[]
    rows: Row[]
}

export interface Column {
    id: string
    name: string
    type: 'text' | 'number' | 'date' | 'select' | 'formula' | 'boolean'
    width: number
    order: number
    options?: string[] // For select type
    formula?: string // For formula type
}

export interface Row {
    id: string
    cells: Record<string, any> // columnId -> value
    order: number
}

export async function createTab(adminId: string, name: string, order: number): Promise<string> {
    const cols = getAdminCollections(adminId)

    // Create sheet first
    const sheetId = await createDocument(cols.sheets, {
        columns: [
            { id: 'col1', name: 'Column A', type: 'text', width: 150, order: 0 },
            { id: 'col2', name: 'Column B', type: 'text', width: 150, order: 1 },
            { id: 'col3', name: 'Column C', type: 'text', width: 150, order: 2 }
        ],
        rows: []
    })

    // Create tab
    const tabId = await createDocument(cols.tabs, {
        name,
        order,
        sheetId
    })

    return tabId
}

export async function deleteTab(adminId: string, tabId: string): Promise<void> {
    const cols = getAdminCollections(adminId)

    // Get tab to find associated sheet
    const tab = await getDocument<Tab>(cols.tabs, tabId)
    if (tab?.sheetId) {
        await deleteDocument(cols.sheets, tab.sheetId)
    }

    await deleteDocument(cols.tabs, tabId)
}

// ============================================
// Utility: Convert Firestore Timestamp
// ============================================

export function timestampToDate(timestamp: Timestamp | null): Date | null {
    return timestamp?.toDate() ?? null
}

export function dateToTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date)
}

// Re-export Firestore functions for convenience
export {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
}
