import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getDatabase, Database } from 'firebase/database'
import { getAuth, Auth } from 'firebase/auth'

// Firebase client configuration
// Get these from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL // Realtime Database URL
}

// Initialize Firebase (singleton pattern)
let app: FirebaseApp
let db: Firestore         // For structured data (customers, orders)
let rtdb: Database        // For real-time collaboration (presence, cells)
let auth: Auth

function initializeFirebase() {
    if (typeof window === 'undefined') return

    if (!getApps().length) {
        app = initializeApp(firebaseConfig)
    } else {
        app = getApps()[0]
    }
    db = getFirestore(app)
    rtdb = getDatabase(app)
    auth = getAuth(app)
}

// Initialize on client side
if (typeof window !== 'undefined') {
    initializeFirebase()
}

export { app, db, rtdb, auth, firebaseConfig }
