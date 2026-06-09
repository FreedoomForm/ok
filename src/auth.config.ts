import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { NextResponse } from "next/server"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const ROLE_HOME: Record<string, string> = {
    SUPER_ADMIN: "/super-admin",
    MIDDLE_ADMIN: "/middle-admin",
    LOW_ADMIN: "/low-admin",
    COURIER: "/courier",
}

export default {
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers: [
        ...(googleClientId && googleClientSecret
            ? [
                  Google({
                      clientId: googleClientId,
                      clientSecret: googleClientSecret,
                  }),
              ]
            : []),
    ],
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.id = (user as any).id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                ;(session.user as any).role = (token as any).role
                ;(session.user as any).id = (token as any).id
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const role = auth?.user?.role
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
                if (!isLoggedIn) {
                    return false // Redirect unauthenticated users to login page
                }

                if (!role || !(role in ROLE_HOME)) {
                    return NextResponse.redirect(new URL("/login", nextUrl))
                }

                const expectedHome = ROLE_HOME[role]
                const isAllowed =
                    (nextUrl.pathname.startsWith("/super-admin") && expectedHome === "/super-admin") ||
                    (nextUrl.pathname.startsWith("/middle-admin") && expectedHome === "/middle-admin") ||
                    (nextUrl.pathname.startsWith("/low-admin") && expectedHome === "/low-admin") ||
                    (nextUrl.pathname.startsWith("/courier") && expectedHome === "/courier")

                if (!isAllowed) {
                    return NextResponse.redirect(new URL("/auth/redirect", nextUrl))
                }

                return true
            }
            return true
        },
    }
} satisfies NextAuthConfig
