import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { extractCoordsFromText } from '@/lib/geo'

type LiveMapPoint = {
  id: string
  name: string
  lat: number
  lng: number
}

type LiveOrderPoint = {
  id: string
  orderNumber: number
  customerName: string
  status: string
  deliveryTime: string
  courierId: string | null
  courierName: string | null
  lat: number
  lng: number
}

type LiveWarehousePoint = {
  lat: number
  lng: number
} | null

function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toEtag({
  couriers,
  clients,
  orders,
  warehouse,
  latestUpdateMs,
  dateKey,
}: {
  couriers: LiveMapPoint[]
  clients: LiveMapPoint[]
  orders: LiveOrderPoint[]
  warehouse: LiveWarehousePoint
  latestUpdateMs: number
  dateKey: string
}) {
  const warehouseKey = warehouse ? `${warehouse.lat.toFixed(6)}:${warehouse.lng.toFixed(6)}` : 'none'
  return `W/"${dateKey}:${latestUpdateMs}:${couriers.length}:${clients.length}:${orders.length}:${warehouseKey}"`
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const selectedDateISO =
      typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : (await getGroupAdminIds(user)) ?? [user.id]
    const ownerAdminId = user.role === 'SUPER_ADMIN' ? null : (await getOwnerAdminId(user)) ?? user.id

    const courierWhere: any = {
      role: 'COURIER',
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    }
    if (groupAdminIds) {
      courierWhere.createdBy = { in: groupAdminIds }
    }

    const clientWhere: any = {
      deletedAt: null,
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    }
    if (groupAdminIds) {
      clientWhere.createdBy = { in: groupAdminIds }
    }

    const orderWhere: any = {
      deletedAt: null,
      orderStatus: { in: ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED'] },
    }
    if (groupAdminIds) {
      orderWhere.adminId = { in: groupAdminIds }
    }
    if (selectedDateISO) {
      const start = new Date(`${selectedDateISO}T00:00:00.000Z`)
      const next = new Date(start)
      next.setUTCDate(next.getUTCDate() + 1)
      orderWhere.OR = [
        { deliveryDate: { gte: start, lt: next } },
        { deliveryDate: null, createdAt: { gte: start, lt: next } },
      ]
    }

    const [courierRows, clientRows, orderRows, warehouseRow] = await Promise.all([
      db.admin.findMany({
        where: courierWhere,
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          updatedAt: true,
        },
      }),
      db.customer.findMany({
        where: clientWhere,
        select: {
          id: true,
          name: true,
          nickName: true,
          latitude: true,
          longitude: true,
          updatedAt: true,
        },
      }),
      db.order.findMany({
        where: orderWhere,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          deliveryTime: true,
          deliveryAddress: true,
          latitude: true,
          longitude: true,
          courierId: true,
          updatedAt: true,
          customer: {
            select: {
              name: true,
            },
          },
          courier: {
            select: {
              name: true,
            },
          },
        },
      }),
      ownerAdminId
        ? db.admin.findUnique({
            where: { id: ownerAdminId },
            select: {
              latitude: true,
              longitude: true,
              updatedAt: true,
            },
          })
        : Promise.resolve(null),
    ])

    const couriers: LiveMapPoint[] = courierRows
      .map((row) => {
        const lat = row.latitude
        const lng = row.longitude
        if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null
        return {
          id: row.id,
          name: row.name,
          lat,
          lng,
        } satisfies LiveMapPoint
      })
      .filter((row): row is LiveMapPoint => !!row)

    const clients: LiveMapPoint[] = clientRows
      .map((row) => {
        const lat = row.latitude
        const lng = row.longitude
        if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null
        return {
          id: row.id,
          name: row.nickName?.trim() || row.name,
          lat,
          lng,
        } satisfies LiveMapPoint
      })
      .filter((row): row is LiveMapPoint => !!row)

    const orders: LiveOrderPoint[] = orderRows
      .map((row) => {
        const parsed = extractCoordsFromText(row.deliveryAddress || '')
        const lat = isFiniteCoord(row.latitude) ? row.latitude : parsed?.lat
        const lng = isFiniteCoord(row.longitude) ? row.longitude : parsed?.lng
        if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null
        return {
          id: row.id,
          orderNumber: typeof row.orderNumber === 'number' ? row.orderNumber : 0,
          customerName: row.customer?.name || 'Client',
          status: String(row.orderStatus),
          deliveryTime: row.deliveryTime || '',
          courierId: row.courierId || null,
          courierName: row.courier?.name || null,
          lat,
          lng,
        } satisfies LiveOrderPoint
      })
      .filter((row): row is LiveOrderPoint => !!row)

    const warehouse: LiveWarehousePoint =
      warehouseRow && isFiniteCoord(warehouseRow.latitude) && isFiniteCoord(warehouseRow.longitude)
        ? { lat: warehouseRow.latitude, lng: warehouseRow.longitude }
        : null

    const latestCourierUpdateMs = courierRows.reduce((max, row) => Math.max(max, row.updatedAt.getTime()), 0)
    const latestClientUpdateMs = clientRows.reduce((max, row) => Math.max(max, row.updatedAt.getTime()), 0)
    const latestOrderUpdateMs = orderRows.reduce((max, row) => Math.max(max, row.updatedAt.getTime()), 0)
    const latestWarehouseUpdateMs = warehouseRow?.updatedAt?.getTime() ?? 0
    const latestUpdateMs = Math.max(
      latestCourierUpdateMs,
      latestClientUpdateMs,
      latestOrderUpdateMs,
      latestWarehouseUpdateMs
    )
    const etag = toEtag({
      couriers,
      clients,
      orders,
      warehouse,
      latestUpdateMs,
      dateKey: selectedDateISO || 'all',
    })

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, no-cache, must-revalidate',
        },
      })
    }

    return NextResponse.json(
      {
        serverTime: new Date().toISOString(),
        couriers,
        clients,
        orders,
        warehouse,
      },
      {
        headers: {
          ETag: etag,
          'Cache-Control': 'private, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching live map data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
