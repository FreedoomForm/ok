import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getDatabase, Database } from 'firebase/database'
import { getAuth, Auth } from 'firebase/auth'

function envValue(name: string) {
    const value = process.env[name]
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

// Firebase client configuration
// Get these from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: envValue('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: envValue('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: envValue('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: envValue('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: envValue('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: envValue('NEXT_PUBLIC_FIREBASE_APP_ID'),
    databaseURL: envValue('NEXT_PUBLIC_FIREBASE_DATABASE_URL') // Realtime Database URL
}

// Initialize Firebase (singleton pattern)
let app: FirebaseApp
let db: Firestore         // For structured data (customers, orders)
let rtdb: Database        // For real-time collaboration (presence, cells)
let auth: Auth
let hasWarnedRealtimeDbConfig = false

function initializeFirebase() {
    if (typeof window === 'undefined') return

    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig)
        } else {
            app = getApps()[0]
        }
        db = getFirestore(app)
        auth = getAuth(app)
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console -- useful local diagnostics when Firebase env is incomplete.
            console.error('[firebase] Failed to initialize Firebase app/auth/firestore.', error)
        }
        return
    }

    const hasRealtimeConfig = Boolean(firebaseConfig.databaseURL || firebaseConfig.projectId)
    if (!hasRealtimeConfig) {
        if (!hasWarnedRealtimeDbConfig && process.env.NODE_ENV !== 'production') {
            hasWarnedRealtimeDbConfig = true
            // eslint-disable-next-line no-console -- useful local diagnostics when realtime config is missing.
            console.warn(
                '[firebase] Realtime Database disabled: set NEXT_PUBLIC_FIREBASE_DATABASE_URL or NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
            )
        }
        return
    }

    try {
        rtdb = firebaseConfig.databaseURL
            ? getDatabase(app, firebaseConfig.databaseURL)
            : getDatabase(app)
    } catch (error) {
        if (!hasWarnedRealtimeDbConfig && process.env.NODE_ENV !== 'production') {
            hasWarnedRealtimeDbConfig = true
            // eslint-disable-next-line no-console -- useful local diagnostics when realtime init fails.
            console.warn('[firebase] Realtime Database unavailable. Collaboration features will run in fallback mode.', error)
        }
    }
}

// Initialize on client side
if (typeof window !== 'undefined') {
    initializeFirebase()
}

export { app, db, rtdb, auth, firebaseConfig }
