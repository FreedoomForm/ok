import { NextRequest, NextResponse } from 'next/server'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { executeGetCustomerProfile, updateCustomerProfile } from '@/modules/sites'
import { AppError } from '@/modules/shared/errors'

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const profile = await executeGetCustomerProfile({ customerId: customer.id })
    return NextResponse.json({ data: profile })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, preferences, calories, deliveryDays, googleMapsLink } = body

    const updated = await updateCustomerProfile(customer.id, {
      name,
      address,
      preferences,
      calories,
      deliveryDays,
      googleMapsLink,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
