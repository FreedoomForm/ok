import admin from 'firebase-admin'

// Initialize Firebase Admin SDK (server-side)
// This requires a service account key from Firebase Console

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null

if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    })
}

export const adminDb = admin.apps.length ? admin.firestore() : null
export const adminAuth = admin.apps.length ? admin.auth() : null
export { admin }
