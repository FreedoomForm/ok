import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser } from '@/lib/auth-utils'
import { passwordSchema } from '@/lib/validations'
import { z } from 'zod'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { currentPassword, newPassword } = body

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            )
        }

        // Validate new password strength using Zod schema
        try {
            passwordSchema.parse(newPassword)
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: error.issues[0].message },
                    { status: 400 }
                )
            }
        }

        // Get admin
        const admin = await db.admin.findUnique({
            where: { id: user.id }
        })

        if (!admin) {
            return NextResponse.json(
                { error: 'Admin not found' },
                { status: 404 }
            )
        }

        // Check if admin has a password (not OAuth-only user)
        if (!admin.password) {
            return NextResponse.json(
                { error: 'Cannot change password for OAuth-only accounts' },
                { status: 400 }
            )
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, admin.password)
        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await db.admin.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        })

        // Log the action
        await db.actionLog.create({
            data: {
                adminId: user.id,
                action: 'PASSWORD_CHANGED',
                entityType: 'ADMIN',
                entityId: user.id,
                description: `Password changed for ${admin.email}`
            }
        })

        return NextResponse.json(
            { success: true, message: 'Password changed successfully' },
            { status: 200 }
        )
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
            },
            { status: 500 }
        )
    }
}
