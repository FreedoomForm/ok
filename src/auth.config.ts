import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export default {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })
    ],
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/middle-admin') ||
                nextUrl.pathname.startsWith('/super-admin') ||
                nextUrl.pathname.startsWith('/low-admin') ||
                nextUrl.pathname.startsWith('/courier')
            const isOnLogin = nextUrl.pathname === '/login'
            const isOnHomePage = nextUrl.pathname === '/'
            const isOnSignup = nextUrl.pathname === '/signup'

            // Allow everyone to access home page, signup page, and login page
            // (even if logged in - they might want to switch accounts)
            if (isOnHomePage || isOnSignup || isOnLogin) {
                return true
            }

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            }
            return true
        },
    }
} satisfies NextAuthConfig
