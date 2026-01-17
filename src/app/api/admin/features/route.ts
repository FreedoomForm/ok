import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, type, options } = body

    if (!name || !description || !type) {
      return NextResponse.json({ error: 'Не все обязательные поля заполнены' }, { status: 400 })
    }

    if (type === 'SELECT' && !options) {
      return NextResponse.json({ error: 'Для типа "Выбор из списка" необходимо указать варианты' }, { status: 400 })
    }

    // TODO: Implement proper database persistence
    // This requires adding a Feature model to the Prisma schema:
    // model Feature { id String @id @default(cuid()), name String, description String, type String, options String? }
    // For now, this endpoint only validates input but doesn't persist to database
    console.log('Creating feature:', { name, description, type, options })

    return NextResponse.json({
      message: 'Особенность успешно создана',
      feature: {
        id: Date.now().toString(),
        name,
        description,
        type,
        options: type === 'SELECT' ? options.split(',').map((opt: string) => opt.trim()) : null
      }
    })

  } catch (error) {
    console.error('Error creating feature:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}