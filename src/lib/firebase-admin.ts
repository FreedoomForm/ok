import admin from 'firebase-admin'

// Initialize Firebase Admin SDK (server-side)
// This requires a service account key from Firebase Console

let serviceAccount: any = null
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON:', error)
        }
        serviceAccount = null
    }
}

if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    })
}

export const adminDb = admin.apps.length ? admin.firestore() : null
export const adminAuth = admin.apps.length ? admin.auth() : null
export { admin }
