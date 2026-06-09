import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { featureCreateSchema, featureIdSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

async function resolveOwnerAdminId(user: { id: string; role: string }) {
  if (user.role === 'SUPER_ADMIN') return user.id
  return (await getOwnerAdminId(user)) ?? user.id
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const ownerAdminId = await resolveOwnerAdminId(user)

    const features = await db.feature.findMany({
      where: { ownerAdminId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(features)
  } catch (error) {
    console.error('Error fetching features:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = featureCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    const ownerAdminId = await resolveOwnerAdminId(user)

    const optionsList =
      parsed.data.type === 'SELECT'
        ? (parsed.data.options ?? '')
            .split(',')
            .map((opt) => opt.trim())
            .filter(Boolean)
        : null

    const feature = await db.feature.create({
      data: {
        ownerAdminId,
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type,
        ...(optionsList ? { options: optionsList as unknown as Prisma.InputJsonValue } : {}),
      }
    })

    return NextResponse.json({ message: 'Особенность успешно создана', feature })
  } catch (error) {
    console.error('Error creating feature:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const idParam = request.nextUrl.searchParams.get('id')
    const idParsed = featureIdSchema.safeParse(idParam)
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.issues[0]?.message ?? 'Invalid id' }, { status: 400 })
    }

    const ownerAdminId = await resolveOwnerAdminId(user)

    const existing = await db.feature.findFirst({
      where: { id: idParsed.data, ownerAdminId },
      select: { id: true }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Особенность не найдена' }, { status: 404 })
    }

    await db.feature.delete({ where: { id: idParsed.data } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feature:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
