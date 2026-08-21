import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import {
  buildCustomerProfileUpdateData,
  customerProfilePatchSchema,
  InvalidCustomerProfileLocationError,
  toCustomerProfileResponse,
} from '@/lib/customer-profile'

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = toCustomerProfileResponse(customer)
    return NextResponse.json({
      ...profile,
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = customerProfilePatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile data' }, { status: 400 })
    }

    let update: ReturnType<typeof buildCustomerProfileUpdateData>
    try {
      update = buildCustomerProfileUpdateData(parsed.data)
    } catch (error) {
      if (error instanceof InvalidCustomerProfileLocationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const updatedCustomer = await db.customer.update({
      where: { id: customer.id },
      data: update.data,
    })

    const profile = toCustomerProfileResponse(updatedCustomer)
    return NextResponse.json({
      ...profile,
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
