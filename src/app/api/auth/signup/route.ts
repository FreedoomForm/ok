import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, name } = body

        // Validate input
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            )
        }

        // Validate password strength (minimum 8 characters)
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingAdmin = await db.admin.findUnique({
            where: { email }
        })

        if (existingAdmin) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Set trial period to 30 days from now
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + 30)

        // Create new admin
        const admin = await db.admin.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'MIDDLE_ADMIN',
                isActive: true,
                hasPassword: true,
                trialEndsAt,
            }
        })

        return NextResponse.json(
            {
                success: true,
                message: 'Account created successfully. You have a 30-day trial period.',
                trialEndsAt: admin.trialEndsAt
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}
