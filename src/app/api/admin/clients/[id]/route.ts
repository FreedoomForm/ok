import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'
import { hashPassword } from '@/lib/customer-auth'
import { getGroupAdminIds } from '@/lib/admin-scope'
import {
  buildClientUpdateData,
  clientIdSchema,
  clientUpdateSchema,
  safeClientSelect,
} from '@/lib/admin/clients'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { id } = await context.params
    const parsedClientId = clientIdSchema.safeParse(id)
    if (!parsedClientId.success) {
      return NextResponse.json({ error: 'Некорректный ID клиента' }, { status: 400 })
    }
    const clientId = parsedClientId.data

    const client = await db.customer.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    // Hard delete orders and client (consider soft delete instead)
    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
    if (groupAdminIds && (!client.createdBy || !groupAdminIds.includes(client.createdBy))) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let deletedOrders = 0
    if (client.isActive) {
      const deletedOrdersResult = await db.order.deleteMany({
        where: {
          customerId: clientId,
          fromAutoOrder: true,
          deliveryDate: { gte: today }
        }
      })
      deletedOrders = deletedOrdersResult.count
    }

    await db.customer.update({
      where: { id: clientId },
      data: { deletedAt: new Date(), deletedBy: user.id }
    })

    return NextResponse.json({ success: true, movedTobin: 1, deletedOrders })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { id } = await context.params
    const parsedClientId = clientIdSchema.safeParse(id)
    if (!parsedClientId.success) {
      return NextResponse.json({ error: 'Некорректный ID клиента' }, { status: 400 })
    }
    const clientId = parsedClientId.data

    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON запроса' }, { status: 400 })
    }

    const parsedBody = clientUpdateSchema.safeParse(requestBody)
    if (!parsedBody.success) {
      return NextResponse.json({
        error: 'Некорректные данные клиента',
        details: parsedBody.error.flatten(),
      }, { status: 400 })
    }
    const input = parsedBody.data

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
    if (groupAdminIds) {
      const existingClient = await db.customer.findUnique({
        where: { id: clientId },
        select: { createdBy: true }
      })
      if (!existingClient || !existingClient.createdBy || !groupAdminIds.includes(existingClient.createdBy)) {
        return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
      }
    }

    const hashedPassword = input.password ? await hashPassword(input.password) : undefined
    const updateData = buildClientUpdateData(input, hashedPassword)
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Необходимо указать изменяемое поле' }, { status: 400 })
    }

    const updatedClient = await db.customer.update({
      where: { id: clientId },
      data: updateData,
      select: safeClientSelect,
    })

    return NextResponse.json({
      message: 'Клиент успешно обновлен',
      client: updatedClient
    })

  } catch (error) {
    console.error('Error updating client:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({
          error: 'Клиент с таким номером телефона уже существует'
        }, { status: 409 })
      }
      if (error.code === 'P2025') {
        return NextResponse.json({
          error: 'Клиент не найден'
        }, { status: 404 })
      }
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
