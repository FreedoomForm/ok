import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { extractCoordsFromText } from '@/lib/geo'

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      ...customer,
      googleMapsLink:
        typeof customer.latitude === 'number' && typeof customer.longitude === 'number'
          ? `https://maps.google.com/?q=${customer.latitude},${customer.longitude}`
          : '',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, preferences, calories, deliveryDays, googleMapsLink } = body

    let parsedCoords: { lat: number; lng: number } | null = null
    if (typeof googleMapsLink === 'string' && googleMapsLink.trim().length > 0) {
      parsedCoords = extractCoordsFromText(googleMapsLink.trim())
      if (!parsedCoords) {
        return NextResponse.json({ error: 'Invalid Google Maps link or coordinates' }, { status: 400 })
      }
    }

    const updatedCustomer = await db.customer.update({
      where: { id: customer.id },
      data: {
        name,
        address:
          typeof address === 'string' && address.trim().length > 0
            ? address
            : typeof googleMapsLink === 'string' && googleMapsLink.trim().length > 0
              ? googleMapsLink.trim()
              : undefined,
        preferences,
        calories: calories ? parseInt(calories) : undefined,
        deliveryDays: deliveryDays ? JSON.stringify(deliveryDays) : undefined,
        latitude: parsedCoords ? parsedCoords.lat : undefined,
        longitude: parsedCoords ? parsedCoords.lng : undefined,
      },
    })

    return NextResponse.json({
      ...updatedCustomer,
      googleMapsLink:
        typeof updatedCustomer.latitude === 'number' && typeof updatedCustomer.longitude === 'number'
          ? `https://maps.google.com/?q=${updatedCustomer.latitude},${updatedCustomer.longitude}`
          : '',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
      },
      { status: 500 }
    )
  }
}
