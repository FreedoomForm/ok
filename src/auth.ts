import NextAuth from "next-auth"
import authConfig from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers,
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const admin = await db.admin.findUnique({
                    where: { email: credentials.email as string }
                })

                if (!admin || !admin.password) {
                    return null
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    admin.password
                )

                if (!passwordMatch) {
                    return null
                }

                // Check if trial has expired
                if (admin.trialEndsAt && new Date() > admin.trialEndsAt && !admin.isActive) {
                    throw new Error("Your trial period has expired. Please contact an administrator.")
                }

                // Check if account is active
                if (!admin.isActive) {
                    throw new Error("Your account has been disabled. Please contact an administrator.")
                }

                return {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                }
            }
        })
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account, profile }) {
            console.log("SignIn Callback:", { provider: account?.provider, email: user.email })
            if (account?.provider === "google") {
                try {
                    // Check if user exists
                    let admin = await db.admin.findUnique({
                        where: { email: user.email! }
                    })
                    console.log("Admin found:", !!admin)

                    if (!admin) {
                        console.log("Creating new Google user...")
                        // Create new user with Google OAuth
                        const trialEndsAt = new Date()
                        trialEndsAt.setDate(trialEndsAt.getDate() + 30)

                        admin = await db.admin.create({
                            data: {
                                email: user.email!,
                                name: user.name || "Google User",
                                googleId: account.providerAccountId,
                                password: null,
                                hasPassword: false,
                                role: "MIDDLE_ADMIN",
                                trialEndsAt,
                                isActive: true, // Will be disabled after 30 days by cron
                            }
                        })
                        console.log("New user created:", admin.id)
                    } else if (!admin.googleId) {
                        console.log("Linking Google account...")
                        // Link Google account to existing user
                        await db.admin.update({
                            where: { id: admin.id },
                            data: { googleId: account.providerAccountId }
                        })
                    }

                    // Check if trial has expired
                    if (admin.trialEndsAt && new Date() > admin.trialEndsAt && !admin.isActive) {
                        console.log("Trial expired")
                        return false
                    }

                    // Check if account is active
                    if (!admin.isActive) {
                        console.log("Account inactive")
                        return false
                    }

                    return true
                } catch (error) {
                    console.error("Error in signIn callback:", error)
                    return false
                }
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.role = user.role as string
                token.id = user.id as string
            }

            // If we have an email but no role/id (or to ensure fresh data), fetch from DB
            if (token.email && (!token.role || !token.id)) {
                const dbUser = await db.admin.findUnique({
                    where: { email: token.email }
                })
                if (dbUser) {
                    token.role = dbUser.role
                    token.id = dbUser.id
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = token.id as string
            }
            return session
        }
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
})
