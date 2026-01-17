import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'
import { hashPassword } from '@/lib/customer-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const clientId = params.id

    const client = await db.customer.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    // Hard delete orders and client (consider soft delete instead)
    await db.order.deleteMany({ where: { customerId: clientId } })
    await db.customer.delete({ where: { id: clientId } })

    return NextResponse.json({ message: 'Клиент успешно удален', client })
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const clientId = params.id
    const body = await request.json()
    const {
      name,
      phone,
      address,
      calories,
      specialFeatures,
      deliveryDays,
      autoOrdersEnabled,
      isActive,
      defaultCourierId
    } = body

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (address) updateData.address = address
    if (specialFeatures !== undefined) updateData.preferences = specialFeatures
    if (isActive !== undefined) updateData.isActive = isActive
    if (defaultCourierId !== undefined) updateData.defaultCourierId = defaultCourierId || null
    if (calories !== undefined) updateData.calories = parseInt(calories) || 2000
    if (autoOrdersEnabled !== undefined) updateData.autoOrdersEnabled = autoOrdersEnabled



    if (deliveryDays) {
      updateData.orderPattern = JSON.stringify(deliveryDays)
      updateData.deliveryDays = JSON.stringify(deliveryDays)
    }

    if (body.password) {
      updateData.password = await hashPassword(body.password)
    }

    const updatedClient = await db.customer.update({
      where: { id: clientId },
      data: updateData
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
