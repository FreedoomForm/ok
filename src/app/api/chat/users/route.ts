import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

// GET - Get list of users current user can chat with based on role
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const currentUser = await db.admin.findUnique({
            where: { id: user.id }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        let availableUsers: any[] = []

        if (currentUser.role === 'SUPER_ADMIN') {
            // Super admin can chat with all middle admins, couriers, and low admins
            availableUsers = await db.admin.findMany({
                where: {
                    id: {
                        not: user.id
                    },
                    isActive: true,
                    role: {
                        in: ['MIDDLE_ADMIN', 'COURIER', 'LOW_ADMIN']
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                },
                orderBy: {
                    name: 'asc'
                }
            })
        } else if (currentUser.role === 'MIDDLE_ADMIN') {
            // Middle admin can chat with:
            // 1. The super admin (creator)
            // 2. Couriers and low admins they created

            // Get super admins
            const superAdmins = await db.admin.findMany({
                where: {
                    role: 'SUPER_ADMIN',
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            })

            // Get created users
            const createdUsers = await db.admin.findMany({
                where: {
                    id: {
                        not: user.id
                    },
                    isActive: true,
                    createdBy: user.id,
                    role: {
                        in: ['COURIER', 'LOW_ADMIN']
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                },
                orderBy: {
                    name: 'asc'
                }
            })

            availableUsers = [...superAdmins, ...createdUsers]
        } else if (currentUser.role === 'COURIER' || currentUser.role === 'LOW_ADMIN') {
            // Couriers/Low admins can chat with:
            // 1. Their creator middle admin
            // 2. Other couriers/low admins created by the same middle admin
            // 3. Super Admins (always available)

            // Get Super Admins
            const superAdmins = await db.admin.findMany({
                where: {
                    role: 'SUPER_ADMIN',
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            })
            availableUsers = [...superAdmins]

            const creatorId = currentUser.createdBy

            if (creatorId) {
                // Get creator
                const creator = await db.admin.findUnique({
                    where: { id: creatorId },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                })

                if (creator) {
                    // Check if creator is already in list (e.g. if creator is super admin)
                    if (!availableUsers.some(u => u.id === creator.id)) {
                        availableUsers.push(creator)
                    }
                }

                // Get peers (other users created by same admin)
                const peers = await db.admin.findMany({
                    where: {
                        id: {
                            not: user.id
                        },
                        isActive: true,
                        createdBy: creatorId,
                        role: {
                            in: ['COURIER', 'LOW_ADMIN']
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                })

                availableUsers = [...availableUsers, ...peers]
            }
        }

        return NextResponse.json({ users: availableUsers })

    } catch (error) {
        console.error('Error fetching available users:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
